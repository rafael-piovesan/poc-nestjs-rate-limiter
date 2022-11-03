import { Provider } from '@nestjs/common';
import { ModuleMetadata, Type } from '@nestjs/common/interfaces';
import { RateLimiterAbstract } from 'rate-limiter-flexible';

export type RateLimiterTrackerGenerator = (
  req: Record<string, any>,
) => string | undefined;

export interface RateLimiterOptions {
  /**
   * @description If you need to create several limiters for different purposes.
   * @default 'GLOBAL'
   */
  keyPrefix?: string;
  /**
   * @description Maximum number of points can be consumed over duration.
   * Limiter compares this number with number of consumed points by key to decide
   * if an operation should be rejected or resolved.
   * @default 4
   */
  points?: number;
  /**
   * @description Number of seconds before consumed points are reset. Keys never
   * expire, if duration is 0.
   * @default 1
   */
  duration?: number;
  /**
   * @description Storage type to be used with the rate limiter.
   * @default 'Memory'
   */
  type?: 'Memory' | 'Redis';
  /**
   * @description Global prefix to be prepended onto all keys.
   * @default 'RATE_LIMITER'
   */
  globalPrefix?: string;
  /**
   * @description The store client to be used with the rate limiter. In case of
   * `Redis` type, a Redis client should be provided for this property. It is
   * optional only for `Memory` type.
   */
  storeClient?: any;
  /**
   * @description Can be used against DDoS attacks. In-memory blocking works
   * in current process memory and for consume method only.
   * @default 0
   */
  inMemoryBlockOnConsumed?: number;
  /**
   * @description Block key for `inMemoryBlockDuration` seconds, if
   * `inMemoryBlockOnConsumed` or more points are consumed.
   * @default 0
   */
  inMemoryBlockDuration?: number;
  /**
   * @description Instance of RateLimiterAbstract extended object to
   * store limits, when database comes up with any error.
   * @default undefined
   */
  insuranceLimiter?: RateLimiterAbstract;
  /**
   * @description Omit Rate Limiting related headers on HTTP response.
   * @default false
   */
  omitResponseHeaders?: boolean;
  /**
   * @description The error message to be returned inside the HTTP response body.
   * @default 'Too many requests'
   */
  errorMessage?: string;
  /**
   * @description Whether logging should be enabled or not.
   * @default true
   */
  logger?: boolean;
  /**
   * @description The Request object's properties lookup path or function to be
   * used while generating key to be tracked for rate limiting.
   * @default 'req.ip'
   */
  tracker?: string | RateLimiterTrackerGenerator;
  /**
   * @description Whether or not to skip rate limiting policy in case it
   * was not possible to get the tracker to be used as the throttling key.
   * @default false
   */
  skipMissingTracker?: boolean;
}

export interface RateLimiterOptionsFactory {
  createRateLimiterOptions(): Promise<RateLimiterOptions> | RateLimiterOptions;
}

export interface RateLimiterModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<RateLimiterOptionsFactory>;
  useClass?: Type<RateLimiterOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<RateLimiterOptions> | RateLimiterOptions;
  inject?: any[];
  extraProviders?: Provider[];
}
