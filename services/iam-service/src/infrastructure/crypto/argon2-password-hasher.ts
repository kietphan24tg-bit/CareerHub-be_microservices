import * as argon2 from 'argon2';
import type { PasswordHasher } from '../../application';

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      memoryCost: 65536,
      parallelism: 4,
      timeCost: 3,
      type: argon2.argon2id
    });
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
