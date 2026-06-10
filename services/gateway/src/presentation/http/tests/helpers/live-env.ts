import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const GATEWAY_BASE_URL =
  process.env.GATEWAY_BASE_URL ?? 'http://127.0.0.1:3000';
export const MAILHOG_API_BASE_URL =
  process.env.MAILHOG_API_BASE_URL ?? 'http://127.0.0.1:8025';
export const RESET_PASSWORD_URL_BASE =
  process.env.RESET_PASSWORD_URL_BASE ?? 'http://localhost:5173/reset-password';

type ServiceDirectory =
  | 'iam-service'
  | 'candidate-service'
  | 'employer-service';

const DATABASE_ENV_OVERRIDES: Record<ServiceDirectory, string> = {
  'candidate-service': 'CANDIDATE_DATABASE_URL',
  'employer-service': 'EMPLOYER_DATABASE_URL',
  'iam-service': 'IAM_DATABASE_URL'
};

export function resolveServiceEnvPath(serviceDirectory: ServiceDirectory): string {
  return resolve(process.cwd(), '..', serviceDirectory, '.env');
}

export function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf8');
  const values: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

export function resolveServiceDatabaseUrl(serviceDirectory: ServiceDirectory): string {
  const envOverrideKey = DATABASE_ENV_OVERRIDES[serviceDirectory];
  const envOverrideValue = process.env[envOverrideKey];

  if (envOverrideValue) {
    return envOverrideValue;
  }

  const values = parseEnvFile(resolveServiceEnvPath(serviceDirectory));
  const databaseUrl = values.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      `DATABASE_URL was not found in ${resolveServiceEnvPath(serviceDirectory)}`
    );
  }

  return databaseUrl;
}
