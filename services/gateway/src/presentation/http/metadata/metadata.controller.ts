import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GatewayMetadataService } from '../../../application/metadata/gateway-metadata.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Metadata')
@Controller('metadata')
export class MetadataController {
  constructor(private readonly gatewayMetadataService: GatewayMetadataService) {}

  @Get('industries')
  @Public()
  listCompanyIndustries() {
    return {
      data: this.gatewayMetadataService.listCompanyIndustries(),
      message: 'Industry metadata loaded successfully'
    };
  }
}