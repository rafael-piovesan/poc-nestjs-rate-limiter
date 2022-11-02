import { RATE_LIMITER_METADATA } from './rate-limiter.constants';
import { RateLimiterOptions } from './rate-limiter.interface';

function setThrottlerMetadata(target: any, options: RateLimiterOptions): void {
  Reflect.defineMetadata(RATE_LIMITER_METADATA, options, target);
}

export const RateLimit = (
  options: RateLimiterOptions,
): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
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
