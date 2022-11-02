import { RateLimiterOptions } from './rate-limiter.interface';

export const defaultRateLimiterOptions: RateLimiterOptions = {
  type: 'Memory',
  keyPrefix: 'GLOBAL',
  globalPrefix: 'RATE_LIMITER',
  points: 4,
  duration: 1,
  omitResponseHeaders: false,
  errorMessage: 'Too many requests',
  logger: true,
};
