import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  RateLimit,
  RateLimiterGuard,
  SkipRateLimit,
} from 'shared/rate-limiter';
import { AppService } from './app.service';

@UseGuards(RateLimiterGuard)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @SkipRateLimit()
  @Get('/unrestricted')
  getUnrestricted(): string {
    return this.appService.getHello();
  }

  @RateLimit({
    points: 2,
    duration: 120,
  })
  @Get('/rate-limited')
  getRateLimited(): string {
    return this.appService.getHello();
  }
}
