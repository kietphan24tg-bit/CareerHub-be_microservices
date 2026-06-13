import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException
} from '@nestjs/common';
import { GatewayAuthService } from '../../../application/auth/gateway-auth.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { parseCookieHeader, parseDurationToMs } from '../../../auth/utils/cookie.utils';
import { GATEWAY_RUNTIME_CONFIG } from '../../../config/gateway.constants';
import type { GatewayRuntimeConfig } from '../../../config/gateway-runtime-config';
import { CandidateRegisterRequestDto } from './dto/candidate-register.request.dto';
import { EmployerRegisterRequestDto } from './dto/employer-register.request.dto';
import { LoginRequestDto } from './dto/login.request.dto';
import { RequestPasswordResetRequestDto } from './dto/request-password-reset.request.dto';
import { ResetPasswordRequestDto } from './dto/reset-password.request.dto';

type CookieRequest = {
  headers: {
    cookie?: string;
  };
};

type CookieResponse = {
  clearCookie: (name: string, options: Record<string, unknown>) => void;
  cookie: (
    name: string,
    value: string,
    options: Record<string, unknown>
  ) => void;
};

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
  private readonly refreshCookieMaxAge: number;

  constructor(
    private readonly gatewayAuthService: GatewayAuthService,
    @Inject(GATEWAY_RUNTIME_CONFIG)
    private readonly gatewayRuntimeConfig: GatewayRuntimeConfig
  ) {
    this.refreshCookieMaxAge = parseDurationToMs(
      gatewayRuntimeConfig.jwtRefreshExpiresIn
    );
  }

  @Post('candidate/register')
  @Public()
  async registerCandidate(
    @Body() dto: CandidateRegisterRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    validatePasswordConfirmation(dto.password, dto.confirmPassword);

    return {
      data: await this.gatewayAuthService.registerCandidate({
        acceptTerms: dto.acceptTerms,
        email: dto.email,
        fullName: dto.fullName,
        password: dto.password,
        phone: dto.phone,
        requestId
      }),
      message: 'Candidate registered successfully'
    };
  }

  @Post('employer/register')
  @Public()
  async registerEmployer(
    @Body() dto: EmployerRegisterRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    validatePasswordConfirmation(dto.password, dto.confirmPassword);

    return {
      data: await this.gatewayAuthService.registerEmployer({
        acceptTerms: dto.acceptTerms,
        address: dto.address,
        companyName: dto.companyName,
        companyEmail: dto.companyEmail,
        fullName: dto.fullName,
        industry: dto.industry,
        password: dto.password,
        phone: dto.phone,
        requestId
      }),
      message: 'Employer registered successfully'
    };
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  async login(
    @Body() dto: LoginRequestDto,
    @Headers('x-request-id') requestId: string | undefined,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const result = await this.gatewayAuthService.login({
      email: dto.email,
      password: dto.password,
      rememberMe: dto.rememberMe === true,
      requestId
    });

    this.setRefreshCookie(response, result.refreshToken, dto.rememberMe === true);

    return {
      data: {
        accessToken: result.accessToken,
        user: result.user
      },
      message: 'Login successful'
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  async refresh(
    @Req() request: CookieRequest,
    @Headers('x-request-id') requestId: string | undefined,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const refreshToken = this.readRefreshCookie(request);

    const result = await this.gatewayAuthService.refresh({
      refreshToken,
      requestId
    });

    this.setRefreshCookie(response, result.refreshToken, result.rememberMe === true);

    return {
      data: {
        accessToken: result.accessToken,
        user: result.user
      },
      message: 'Token refreshed successfully'
    };
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  async logout(
    @Req() request: CookieRequest,
    @Headers('x-request-id') requestId: string | undefined,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const refreshToken = this.readOptionalRefreshCookie(request);

    if (refreshToken) {
      await this.gatewayAuthService.logout({
        refreshToken,
        requestId
      });
    }

    this.clearRefreshCookie(response);

    return {
      data: {
        loggedOut: true
      },
      message: 'Logout successful'
    };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayAuthService.requestPasswordReset({
        email: dto.email,
        requestId
      }),
      message:
        'If the email exists, a password reset instruction has been accepted'
    };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  async resetPassword(
    @Body() dto: ResetPasswordRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayAuthService.resetPassword({
        newPassword: dto.newPassword,
        requestId,
        token: dto.token
      }),
      message: 'Password reset successful'
    };
  }

  @Get('me')
  @Roles('candidate', 'employer')
  async getMe(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayAuthService.getCurrentUser({
        identityId: user.id,
        requestId
      }),
      message: 'Current user loaded successfully'
    };
  }

  private readOptionalRefreshCookie(request: CookieRequest): string | undefined {
    return parseCookieHeader(request.headers.cookie)[
      this.gatewayRuntimeConfig.authRefreshCookieName
    ];
  }

  private readRefreshCookie(request: CookieRequest): string {
    const token = this.readOptionalRefreshCookie(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Refresh token cookie is missing or expired'
      });
    }

    return token;
  }

  private setRefreshCookie(
    response: CookieResponse,
    refreshToken: string,
    rememberMe: boolean
  ): void {
    response.cookie(this.gatewayRuntimeConfig.authRefreshCookieName, refreshToken, {
      domain: this.gatewayRuntimeConfig.authRefreshCookieDomain,
      httpOnly: true,
      maxAge: rememberMe ? this.refreshCookieMaxAge : undefined,
      path: '/auth',
      sameSite: 'lax',
      secure: this.gatewayRuntimeConfig.authRefreshCookieSecure
    });
  }

  private clearRefreshCookie(response: CookieResponse): void {
    response.clearCookie(this.gatewayRuntimeConfig.authRefreshCookieName, {
      domain: this.gatewayRuntimeConfig.authRefreshCookieDomain,
      httpOnly: true,
      path: '/auth',
      sameSite: 'lax',
      secure: this.gatewayRuntimeConfig.authRefreshCookieSecure
    });
  }
}
