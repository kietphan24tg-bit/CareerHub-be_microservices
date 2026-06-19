import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../../auth/decorators/public.decorator';

@Controller()
@SkipThrottle()
export class GatewayController {
  @Get()
  @Public()
  getRoot() {
    return {
      data: {
        service: 'gateway',
        status: 'ready'
      },
      message: 'Gateway is running'
    };
  }
}
