import { Reflector } from '@nestjs/core';
import {
  Injectable,
  ExecutionContext,
  Inject,
  HttpStatus,
  Logger,
  HttpException,
  CanActivate,
} from '@nestjs/common';
import {
  RateLimiterMemory,
  RateLimiterRes,
  RateLimiterAbstract,
  RateLimiterRedis,
  IRateLimiterStoreOptions,
} from 'rate-limiter-flexible';
import { RateLimiterOptions } from './rate-limiter.interface';
import { defaultRateLimiterOptions } from './default-options';
import { RATE_LIMITER_METADATA } from './rate-limiter.constants';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private rateLimiters: Map<string, RateLimiterAbstract> = new Map();
  private specificOptions: RateLimiterOptions;

  constructor(
    @Inject('RATE_LIMITER_OPTIONS') private options: RateLimiterOptions,
    @Inject('Reflector') private readonly reflector: Reflector,
  ) {}

  async getRateLimiter(
    options?: RateLimiterOptions,
  ): Promise<RateLimiterAbstract> {
    this.options = { ...defaultRateLimiterOptions, ...this.options };
    this.specificOptions = options;

    const opts: RateLimiterOptions = {
      ...this.options,
      ...options,
    };

    if (opts.globalPrefix) {
      opts.keyPrefix = `${opts.globalPrefix}:${opts.keyPrefix}`;
    }

    let rateLimiter: RateLimiterAbstract = this.rateLimiters.get(
      opts.keyPrefix,
    );

    if (opts.execEvenlyMinDelayMs === undefined) {
      opts.execEvenlyMinDelayMs =
        (this.options.duration * 1000) / this.options.points;
    }

    if (!rateLimiter) {
      const logger = this.specificOptions?.logger || this.options.logger;
      switch (this.specificOptions?.type || this.options.type) {
        case 'Memory':
          rateLimiter = new RateLimiterMemory(opts);
          if (logger) {
            Logger.log(
              `Rate Limiter started with ${opts.keyPrefix} key prefix`,
              'RateLimiterMemory',
            );
          }
          break;
        case 'Redis':
          if (!opts.inMemoryBlockOnConsumed) {
            // prevent accessing Redis when all points are already consumed
            opts.inMemoryBlockOnConsumed = opts.points ?? opts.points + 1;
          }
          if (!opts.insuranceLimiter) {
            // setup a fallback rate limiter in case Redis goes offline
            opts.insuranceLimiter = new RateLimiterMemory({
              duration: opts.duration,
              points: opts.points,
            });
          }
          rateLimiter = new RateLimiterRedis(opts as IRateLimiterStoreOptions);
          if (logger) {
            Logger.log(
              `Rate Limiter started with ${opts.keyPrefix} key prefix`,
              'RateLimiterRedis',
            );
          }
          break;
        default:
          throw new Error(
            `Invalid "type" option provided to RateLimiterGuard. Value was ${opts.type}`,
          );
      }

      this.rateLimiters.set(opts.keyPrefix, rateLimiter);
    }

    return rateLimiter;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const opts = this.reflector.getAllAndOverride<RateLimiterOptions>(
      RATE_LIMITER_METADATA,
      [handler, classRef],
    );

    const points =
      opts?.points || this.specificOptions?.points || this.options.points;

    const pointsConsumed =
      opts?.pointsConsumed ||
      this.specificOptions?.pointsConsumed ||
      this.options.pointsConsumed;

    const { req, res } = this.httpHandler(context);
    const rateLimiter = await this.getRateLimiter(opts);
    const key = this.getTracker(req);

    await this.responseHandler(res, key, rateLimiter, points, pointsConsumed);
    return true;
  }

  private getTracker(request: Record<string, any>): string {
    return request.ip?.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)?.[0];
  }

  private httpHandler(context: ExecutionContext) {
    return {
      req: context.switchToHttp().getRequest(),
      res: context.switchToHttp().getResponse(),
    };
  }

  private async setResponseHeaders(
    response: any,
    points: number,
    rateLimiterResponse: RateLimiterRes,
  ) {
    response.header(
      'Retry-After',
      Math.ceil(rateLimiterResponse.msBeforeNext / 1000),
    );
    response.header('X-RateLimit-Limit', points);
    response.header('X-Retry-Remaining', rateLimiterResponse.remainingPoints);
    response.header(
      'X-Retry-Reset',
      new Date(Date.now() + rateLimiterResponse.msBeforeNext).toUTCString(),
    );
  }

  private async responseHandler(
    response: any,
    key: any,
    rateLimiter: RateLimiterAbstract,
    points: number,
    pointsConsumed: number,
  ) {
    try {
      const rateLimiterResponse: RateLimiterRes = await rateLimiter.consume(
        key,
        pointsConsumed,
      );
      const omitHeaders =
        this.specificOptions?.omitResponseHeaders ||
        this.options.omitResponseHeaders;

      if (!omitHeaders) {
        this.setResponseHeaders(response, points, rateLimiterResponse);
      }
    } catch (rateLimiterResponse) {
      response.header(
        'Retry-After',
        Math.ceil(rateLimiterResponse.msBeforeNext / 1000),
      );
      if (
        typeof this.specificOptions?.customResponseSchema === 'function' ||
        typeof this.options.customResponseSchema === 'function'
      ) {
        const errorBody =
          this.specificOptions?.customResponseSchema ||
          this.options.customResponseSchema;
        throw new HttpException(
          errorBody(rateLimiterResponse),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else {
        throw new HttpException(
          this.specificOptions?.errorMessage || this.options.errorMessage,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }
}
