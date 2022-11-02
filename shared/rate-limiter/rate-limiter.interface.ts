import { Provider } from '@nestjs/common';
import { ModuleMetadata, Type } from '@nestjs/common/interfaces';
import {
  IRateLimiterOptions,
  IRateLimiterRedisOptions,
  RateLimiterRes,
} from 'rate-limiter-flexible';

export interface RateLimiterOptions
  extends IRateLimiterOptions,
    Partial<
      Omit<
        IRateLimiterRedisOptions,
        'inmemoryBlockOnConsumed' | 'inmemoryBlockDuration'
      >
    > {
  type?: 'Memory' | 'Redis';
  globalPrefix?: string;
  pointsConsumed?: number;
  omitResponseHeaders?: boolean;
  errorMessage?: string;
  logger?: boolean;
  customResponseSchema?: (rateLimiterResponse: RateLimiterRes) => unknown;
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
