import { RedisModule, RedisService } from '@liaoliaots/nestjs-redis';
import { Module } from '@nestjs/common';
import { RateLimiterModule } from 'shared/rate-limiter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: 'localhost',
        port: 6379,
        enableOfflineQueue: false,
        retryStrategy: () => 3000,
      },
    }),
    RateLimiterModule.registerAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => {
        const client = redisService.getClient();
        return {
          storeClient: client,
          type: 'Redis',
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
