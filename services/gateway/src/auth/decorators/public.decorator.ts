import { SetMetadata } from '@nestjs/common';
import { GATEWAY_IS_PUBLIC_KEY } from '../auth.constants';

export const Public = () => SetMetadata(GATEWAY_IS_PUBLIC_KEY, true);
