import { createHmac, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamableFile } from '@nestjs/common';
import { chromium } from 'playwright';
import type { GatewayEnvironmentVariables } from '../../config/gateway-env.schema';
import type { EnvironmentVariables } from '@careerhub/infrastructure';
import { GatewayResumesService } from './gateway-resumes.service';

type ExportTokenPayload = {
  exp: number;
  identityId: string;
  resumeId: string;
};

@Injectable()
export class GatewayResumeExportService {
  constructor(
    private readonly gatewayResumesService: GatewayResumesService,
    private readonly configService: ConfigService<
      GatewayEnvironmentVariables & EnvironmentVariables,
      true
    >
  ) {}

  signExportToken(input: {
    identityId: string;
    resumeId: string;
  }): string {
    const payload: ExportTokenPayload = {
      exp: Date.now() + 5 * 60 * 1000,
      identityId: input.identityId,
      resumeId: input.resumeId
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url'
    );
    const signature = createHmac('sha256', this.getJwtSecret())
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  verifyExportToken(token: string): ExportTokenPayload {
    const [encodedPayload, signature] = token.split('.');

    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Resume export token is invalid');
    }

    const expectedSignature = createHmac('sha256', this.getJwtSecret())
      .update(encodedPayload)
      .digest();
    const receivedSignature = Buffer.from(signature, 'base64url');

    if (
      expectedSignature.length !== receivedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      throw new UnauthorizedException('Resume export token is invalid');
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as ExportTokenPayload;

    if (!payload.resumeId || !payload.identityId || Date.now() > payload.exp) {
      throw new UnauthorizedException('Resume export token is expired');
    }

    return payload;
  }

  async getExportPayloadByToken(token: string) {
    const payload = this.verifyExportToken(token);

    return this.gatewayResumesService.getExportPayload(
      payload.identityId,
      payload.resumeId
    );
  }

  async exportResumePdf(
    identityId: string,
    resumeId: string
  ): Promise<{ file: StreamableFile; filename: string }> {
    const resume = await this.gatewayResumesService.getResumeDetail(
      identityId,
      resumeId
    );
    const token = this.signExportToken({ identityId, resumeId });
    const printBaseUrl = this.resolvePrintBaseUrl();
    const printUrl = `${printBaseUrl}/resume-print?token=${encodeURIComponent(token)}`;
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'careerhub-resume-'));
    const filename = `${slugify(resume.title || 'resume')}.pdf`;
    const outputPath = join(tempDir, filename);

    try {
      const browser = await chromium.launch({ headless: true });

      try {
        const page = await browser.newPage();
        await page.goto(printUrl, { waitUntil: 'networkidle' });
        await page.emulateMedia({ media: 'screen' });
        await page.evaluate(async () => {
          if ('fonts' in document) {
            await document.fonts.ready;
          }
        });
        await page.pdf({
          format: 'A4',
          margin: {
            bottom: '0',
            left: '0',
            right: '0',
            top: '0'
          },
          path: outputPath,
          printBackground: true
        });
      } finally {
        await browser.close();
      }

      const buffer = await fs.readFile(outputPath);

      return {
        file: new StreamableFile(buffer),
        filename
      };
    } finally {
      await fs.rm(tempDir, { force: true, recursive: true });
    }
  }

  private getJwtSecret(): string {
    return this.configService.getOrThrow('JWT_SECRET');
  }

  private resolvePrintBaseUrl(): string {
    const configured = this.configService.get('RESUME_PRINT_BASE_URL');

    if (typeof configured === 'string' && configured.trim().length > 0) {
      return configured.replace(/\/+$/, '');
    }

    return 'http://localhost:5173';
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'resume';
}
