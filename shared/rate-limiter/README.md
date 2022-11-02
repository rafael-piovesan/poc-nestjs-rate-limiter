# Rate Limiter Module
This is a stripped down version of [ozkanonur/nestjs-rate-limiter](https://github.com/ozkanonur/nestjs-rate-limiter) (which is no longer maintained). Check it out for more details and insights on the decisions that have been made.

The main focus of this module is to just provide a thin wrapper on top of [animir/node-rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible), a mature and flexible rate limiting library for NodeJS that offers many interesting features, and to name a few:
- different types of storage
- insurance strategy (i.e., a fallback rate limiter in case the main external storage is offline or can't be reached for whatever reasons)
- atomic increments (to prevent race conditions)
- in memory block strategy (to avoid accessing external storage in case all points were already consumed locally in memory)
- and great metadata, which is important when assembling HTTP response headers