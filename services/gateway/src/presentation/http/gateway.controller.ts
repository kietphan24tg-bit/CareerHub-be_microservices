import { Controller, Get } from '@nestjs/common';

@Controller()
export class GatewayController {
  @Get()
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
