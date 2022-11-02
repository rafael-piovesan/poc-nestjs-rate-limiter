import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimiterGuard } from 'shared/rate-limiter';
import { AppService } from './app.service';

@UseGuards(RateLimiterGuard)
@Controller()
export class RateLimitedController {
  constructor(private readonly appService: AppService) {}

  @RateLimit({
    points: 2,
    duration: 120,
  })
  @Get('/rate-limited')
  getRateLimited(): string {
    return this.appService.getHello();
  }
}
