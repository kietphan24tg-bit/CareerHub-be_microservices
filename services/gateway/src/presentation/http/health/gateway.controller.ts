import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../auth/decorators/public.decorator';

@Controller()
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
