import { getCompanyIndustriesMetadata } from '@careerhub/shared-kernel';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayMetadataService {
  listCompanyIndustries() {
    return getCompanyIndustriesMetadata();
  }
}