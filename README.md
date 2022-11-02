# About
This is just a toy project aiming to implement a rate limiting module to be used alongside [NestJS](https://nestjs.com/) applications.

## Initial considerations
Before coming up with this solution, the obvious choice was to take a look at the official [NestJS Throttler Module](https://github.com/nestjs/throttler) (docs [here](https://docs.nestjs.com/security/rate-limiting#rate-limiting)).

As one would expect, it integrates well with the framework and offers good utility decorators, greatly simplifying the setup of a basic rate limiting strategy on any NestJS application. The problem arises when push comes to implementing it in a distributed service. There's no official implementation of an external storage service that works with the library.

So, after running a simple search, one could find this open source project [kkoomen/nestjs-throttler-storage-redis](https://github.com/kkoomen/nestjs-throttler-storage-redis), that addresses this exact issue. It does great job providing a simple and functional solution, but still falls short for a couple reasons: (i) its implementation relies on scanning all the keys searching for the ones that match against a given pattern (which is still fast, but not ideal) and, (ii) it doesn't prevent race condition problems, meaning, under heavy traffic generated for the same key, there's a chance that more requests than the allowed limit would make through the limiter (which obviously might not be ideal).

That's why, given the lack of a well stablished and official implementation, this project steered away from the prior solutions and has settled with a rather popular rate limiting library for NodeJS appliactions.

## Node Rate Limiter Flexible
After the initial considerations, the chosen library for this work was the [animir/node-rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible), a mature and flexible rate limiting library for NodeJS that offers many interesting features, from which these might be the most relevant ones:
- different types of storage (Redis, Memcache, Mongo, MySQL, Postgres and Memory)
- insurance strategy (i.e., a fallback rate limiter in case the main external storage can't be reached for whatever reasons)
- no race conditions
- in memory block strategy (to avoid accessing external storage in case all points were already consumed locally in memory)
- and great metadata (which is important when assembling HTTP response headers)

## Installation & Setup
In order to test it locally, a Redis instance is required. As a convenience, there's a `docker-compose.yml` file that could be used to launch a standalone version of Redis locally. Also, the load tests mentioned further down were executed with [codesenberg/bombardier](https://github.com/codesenberg/bombardier).

```bash
# Install the dependencies
npm i
# Start Redis server
docker-compose up -d
# Run the server
npm run start
```

## Running the tests

**Note**: All tests with 1000 concurrent requests and maximum of 2000 requests per sec during 60 seconds

Generating a baseline for an unprotected (non-rate-limited) route:
```bash
bombardier -c 1000 -d 60s -l -r 2000 -t 1s "http://localhost:3000/unrestricted"
```
Results:
```log
Bombarding http://localhost:3000/unrestricted for 1m0s using 1000 connection(s)
[=========================================================================] 1m0s
Done!
Statistics        Avg      Stdev        Max
  Reqs/sec      2000.34      59.40    3185.81
  Latency        3.35ms   722.21us    28.87ms
  Latency Distribution
     50%     3.31ms
     75%     4.58ms
     90%     5.48ms
     95%     5.97ms
     99%     6.81ms
  HTTP codes:
    1xx - 0, 2xx - 120000, 3xx - 0, 4xx - 0, 5xx - 0
    others - 0
  Throughput:   611.34KB/s
```

Running the tests against a rate limited route:
```bash
bombardier -c 1000 -d 60s -l -r 2000 -t 1s "http://localhost:3000/rate-limited"
```

Results:
```log
Bombarding http://localhost:3000/rate-limited for 1m0s using 1000 connection(s)
[=========================================================================] 1m0s
Done!
Statistics        Avg      Stdev        Max
  Reqs/sec      2001.19     129.13    4501.51
  Latency        3.55ms     1.97ms    84.60ms
  Latency Distribution
     50%     3.47ms
     75%     4.79ms
     90%     5.70ms
     95%     6.14ms
     99%     6.95ms
  HTTP codes:
    1xx - 0, 2xx - 2, 3xx - 0, 4xx - 119998, 5xx - 0
    others - 0
  Throughput:   760.47KB/s
```