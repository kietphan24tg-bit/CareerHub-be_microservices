import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post
} from '@nestjs/common';
import { GatewayAuthService } from '../../application/gateway-auth.service';
import { CandidateRegisterRequestDto } from './dto/candidate-register.request.dto';
import { EmployerRegisterRequestDto } from './dto/employer-register.request.dto';

function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): void {
  if (password !== confirmPassword) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Password confirmation does not match password'
    });
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly gatewayAuthService: GatewayAuthService) {}

  @Post('candidate/register')
  async registerCandidate(
    @Body() dto: CandidateRegisterRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    validatePasswordConfirmation(dto.password, dto.confirmPassword);

    return {
      data: await this.gatewayAuthService.registerCandidate({
        acceptTerms: dto.acceptTerms,
        email: dto.email,
        password: dto.password,
        requestId
      }),
      message: 'Candidate registered successfully'
    };
  }

  @Post('employer/register')
  async registerEmployer(
    @Body() dto: EmployerRegisterRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    validatePasswordConfirmation(dto.password, dto.confirmPassword);

    return {
      data: await this.gatewayAuthService.registerEmployer({
        acceptTerms: dto.acceptTerms,
        companyEmail: dto.companyEmail,
        password: dto.password,
        requestId
      }),
      message: 'Employer registered successfully'
    };
  }
}
