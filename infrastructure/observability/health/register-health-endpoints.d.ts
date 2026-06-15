import type { INestApplication } from '@nestjs/common';
import { RuntimeHealthRegistry } from './health.registry';
type HealthEndpointOptions = {
    healthPath?: string;
    livenessPath?: string;
    readinessPath?: string;
};
export declare function registerHealthEndpoints(app: INestApplication, healthRegistry: RuntimeHealthRegistry, options?: HealthEndpointOptions): void;
export {};
