import { RateLimiterOptions } from './rate-limiter.interface';

export const defaultRateLimiterOptions: RateLimiterOptions = {
  type: 'Memory',
  keyPrefix: 'global',
  globalPrefix: 'RATE_LIMITER',
  points: 4,
  duration: 1,
  execEvenly: false,
  omitResponseHeaders: false,
  errorMessage: 'Too many requests',
  logger: true,
};
