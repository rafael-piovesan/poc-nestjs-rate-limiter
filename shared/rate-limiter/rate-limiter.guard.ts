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

  constructor(
    @Inject('RATE_LIMITER_OPTIONS') private options: RateLimiterOptions,
    @Inject('Reflector') private readonly reflector: Reflector,
  ) {}

  async getRateLimiter(
    options?: RateLimiterOptions,
  ): Promise<RateLimiterAbstract> {
    this.options = { ...defaultRateLimiterOptions, ...this.options };

    const opts: RateLimiterOptions = {
      ...this.options,
      ...options,
    };

    if (opts.globalPrefix) {
      opts.keyPrefix = `${opts.globalPrefix}:${opts.keyPrefix}`;
    }

    let rateLimiter = this.rateLimiters.get(opts.keyPrefix);

    if (!rateLimiter) {
      switch (this.options.type) {
        case 'Memory':
          rateLimiter = new RateLimiterMemory(opts);
          if (this.options.logger) {
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
          if (this.options.logger) {
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

    const points = opts?.points || this.options.points;

    const { req, res } = this.httpHandler(context);
    const rateLimiter = await this.getRateLimiter(opts);
    const key = this.getTracker(req);

    await this.responseHandler(res, key, rateLimiter, points);
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
  ) {
    try {
      const rateLimiterResponse = await rateLimiter.consume(key);
      if (!this.options.omitResponseHeaders) {
        this.setResponseHeaders(response, points, rateLimiterResponse);
      }
    } catch (rateLimiterResponse) {
      response.header(
        'Retry-After',
        Math.ceil(rateLimiterResponse.msBeforeNext / 1000),
      );
      if (typeof this.options.customResponseSchema === 'function') {
        throw new HttpException(
          this.options.customResponseSchema(rateLimiterResponse),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else {
        throw new HttpException(
          this.options.errorMessage,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }
}
