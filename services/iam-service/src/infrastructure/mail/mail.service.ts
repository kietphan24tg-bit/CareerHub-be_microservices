import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import {
  getIamMailConfig,
  isIamMailConfigured,
  type IamEnvironmentVariables,
  type IamMailConfig
} from '../../config';

export type SendPasswordResetMailParams = {
  email: string;
  expiresAt: string;
  identityId: string;
  resetToken: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailConfig: IamMailConfig;
  private readonly transporter: Transporter | null;

  constructor(
    configService: ConfigService<IamEnvironmentVariables, true>
  ) {
    this.mailConfig = getIamMailConfig(configService);

    if (!isIamMailConfigured(this.mailConfig)) {
      this.transporter = null;
      this.logger.warn(
        'Mail transport is not configured; password reset emails will be skipped. Configure MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, and MAIL_FROM_ADDRESS.'
      );
      return;
    }

    this.transporter = createTransport({
      auth: {
        pass: this.mailConfig.password as string,
        user: this.mailConfig.user as string
      },
      host: this.mailConfig.host as string,
      port: this.mailConfig.port as number,
      secure: this.mailConfig.secure
    });
  }

  async sendPasswordResetMail(params: SendPasswordResetMailParams): Promise<void> {
    if (!this.transporter || !this.mailConfig.fromAddress) {
      this.logger.warn('Mail transport is not configured; skipping password reset email.', {
        email: params.email,
        identityId: params.identityId
      });
      throw new Error('Mail transport is not configured');
    }

    if (!this.mailConfig.resetPasswordUrlBase) {
      this.logger.warn(
        'RESET_PASSWORD_URL_BASE is not configured; skipping password reset email.',
        {
          email: params.email,
          identityId: params.identityId
        }
      );
      throw new Error('RESET_PASSWORD_URL_BASE is not configured');
    }

    const resetUrl = `${this.mailConfig.resetPasswordUrlBase}?token=${encodeURIComponent(params.resetToken)}`;
    const subject = 'Reset your CareerHub password';
    const text = [
      'CareerHub',
      '',
      'You requested a password reset.',
      '',
      `Reset your password: ${resetUrl}`,
      '',
      `This link expires at ${params.expiresAt}.`,
      '',
      'If you did not request this, you can ignore this email.'
    ].join('\n');
    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;font-family:Arial,sans-serif;color:#172033;">
    <h1 style="font-size:24px;margin:0 0 16px;">Reset your password</h1>
    <p style="font-size:16px;line-height:1.6;color:#475569;">
      You requested a password reset for your CareerHub account.
    </p>
    <p style="padding:16px 0;">
      <a href="${this.escapeHtml(resetUrl)}" style="display:inline-block;background-color:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">
        Reset password
      </a>
    </p>
    <p style="font-size:14px;line-height:1.6;color:#64748b;">
      This link expires at ${this.escapeHtml(params.expiresAt)}.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#64748b;">
      If you did not request this, you can ignore this email.
    </p>
  </body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.formatFromAddress(),
        html,
        subject,
        text,
        to: params.email
      });
      this.logger.log('Password reset email sent', {
        email: params.email,
        identityId: params.identityId
      });
    } catch (error) {
      this.logger.error('Failed to send password reset email.', error, {
        email: params.email,
        identityId: params.identityId
      });
      throw error;
    }
  }

  private formatFromAddress(): string {
    const escapedName = this.mailConfig.fromName.replace(/"/g, '\\"');
    return `"${escapedName}" <${this.mailConfig.fromAddress}>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
