import { Controller, Get, Headers } from '@nestjs/common';
import { GatewayService } from '../../application/gateway.service';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

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

  @Get('events/technical')
  async publishTechnicalEvent(@Headers('x-request-id') requestId?: string) {
    return {
      data: await this.gatewayService.publishTechnicalEvent(requestId),
      message: 'Technical event published'
    };
  }
}
