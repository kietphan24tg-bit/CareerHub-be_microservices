import { resolve } from 'node:path';
import { resolveServiceDatabaseUrl } from './live-env';

export type SqlClient = {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

type ServiceDirectory =
  | 'iam-service'
  | 'candidate-service'
  | 'employer-service';

export function createPgClient(serviceDirectory: ServiceDirectory): SqlClient {
  const connectionString = resolveServiceDatabaseUrl(serviceDirectory);
  const { Client } = require(resolve(
    process.cwd(),
    '..',
    serviceDirectory,
    'node_modules',
    'pg'
  )) as {
    Client: new (options: {
      connectionString: string;
      ssl?: { rejectUnauthorized: boolean };
    }) => SqlClient;
  };

  return new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined
  });
}
