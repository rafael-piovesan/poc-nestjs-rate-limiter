import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/unrestricted')
  getUnrestricted(): string {
    return this.appService.getHello();
  }
}
