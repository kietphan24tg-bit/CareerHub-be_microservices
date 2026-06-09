import { createHmac } from 'node:crypto';
import type {
  PasswordResetTokenGenerator,
  PasswordResetTokenParts
} from '../../application';

export class PasswordResetTokenFactory implements PasswordResetTokenGenerator {
  constructor(private readonly secret: string) {}

  createToken(parts: PasswordResetTokenParts): string {
    const payload = [parts.tokenId, parts.identityId, parts.expiresAt].join('.');
    const signature = createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url');

    return `${parts.tokenId}.${signature}`;
  }
}
