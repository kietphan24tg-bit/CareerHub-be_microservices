import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { CommunicationEnvironmentVariables } from '../../config';
import { Injectable } from '@nestjs/common';
import {
  getCommunicationMailConfig,
  isCommunicationMailConfigured,
  type CommunicationMailConfig
} from '../../config/communication-mail-config';
import {
  renderInterviewMail,
  renderOfferMail,
  type RenderedRecruitmentMail
} from './recruitment-mail-template.renderer';
import type {
  RecruitmentMailInterviewPayload,
  RecruitmentMailOfferPayload
} from '@careerhub/contracts';

export class MailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailConfigurationError';
  }
}

export type SendInterviewMailParams = {
  email: string;
  payload: RecruitmentMailInterviewPayload;
};

export type SendOfferMailParams = {
  email: string;
  payload: RecruitmentMailOfferPayload;
};

@Injectable()
export class RecruitmentMailService {
  private readonly mailConfig: CommunicationMailConfig;
  private readonly transporter: Transporter | null;

  constructor(configService: ConfigService<CommunicationEnvironmentVariables, true>) {
    this.mailConfig = getCommunicationMailConfig(configService);

    if (!isCommunicationMailConfigured(this.mailConfig)) {
      this.transporter = null;
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

  async sendInterviewMail(params: SendInterviewMailParams): Promise<void> {
    const rendered = renderInterviewMail(params.payload);
    await this.sendRenderedMail(params.email, rendered);
  }

  async sendOfferMail(params: SendOfferMailParams): Promise<void> {
    const rendered = renderOfferMail(params.payload);
    await this.sendRenderedMail(params.email, rendered);
  }

  private async sendRenderedMail(email: string, rendered: RenderedRecruitmentMail): Promise<void> {
    if (!this.transporter || !this.mailConfig.fromAddress) {
      throw new MailConfigurationError('Mail transport is not configured');
    }

    await this.transporter.sendMail({
      from: this.formatFromAddress(),
      html: rendered.html,
      subject: rendered.subject,
      text: rendered.text,
      to: email
    });
  }

  private formatFromAddress() {
    const escapedName = this.mailConfig.fromName.replace(/"/g, '\\"');
    return `"${escapedName}" <${this.mailConfig.fromAddress}>`;
  }
}
