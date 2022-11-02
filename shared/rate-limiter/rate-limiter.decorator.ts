import {
  RATE_LIMITER_METADATA,
  RATE_LIMITER_SKIP,
} from './rate-limiter.constants';
import { RateLimiterOptions } from './rate-limiter.interface';

function setThrottlerMetadata(target: any, options: RateLimiterOptions): void {
  Reflect.defineMetadata(RATE_LIMITER_METADATA, options, target);
}

/**
 * Adds metadata to the target which will be handled by the RateLimiterGuard to
 * handle incoming requests based on the given metadata.
 * @usage @RateLimit({
 *  points: 2,
 *  duration: 60,
 *  keyPrefix: 'my-path'
 * })
 */
export const RateLimit = (
  options: RateLimiterOptions,
): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    _propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      setThrottlerMetadata(descriptor.value, options);
      return descriptor;
    }
    setThrottlerMetadata(target, options);
    return target;
  };
};

/**
 * Adds metadata to the target which will be handled by the RateLimiterGuard
 * whether or not to skip throttling for this context.
 * @usage @SkipRateLimit()
 * @usage @SkipRateLimit(false)
 * @publicApi
 */
export const SkipRateLimit = (
  skip = true,
): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    _propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(RATE_LIMITER_SKIP, skip, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(RATE_LIMITER_SKIP, skip, target);
    return target;
  };
};
