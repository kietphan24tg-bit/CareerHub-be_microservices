import { ValidationPipe } from '@nestjs/common';
type ValidationPipeOptions = ConstructorParameters<typeof ValidationPipe>[0];
export declare function createValidationPipe(options?: ValidationPipeOptions): ValidationPipe;
export {};
