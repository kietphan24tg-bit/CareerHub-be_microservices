import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import argon2 from 'argon2';

const DEMO_PASSWORD = 'demo123';
const DEMO_EMAILS = ['candidate@careerhub.dev', 'employer@careerhub.dev'];

function loadDatabaseUrl() {
  const env = fs.readFileSync(path.resolve('.env'), 'utf8');
  const match = env.match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error('DATABASE_URL not found');
  return match[1].trim().replace(/^"|"$/g, '');
}

const hash = await argon2.hash(DEMO_PASSWORD, {
  memoryCost: 65536,
  parallelism: 4,
  timeCost: 3,
  type: argon2.argon2id
});

const client = new Client({ connectionString: loadDatabaseUrl() });
await client.connect();

for (const email of DEMO_EMAILS) {
  const result = await client.query(
    'UPDATE identities SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING email, left(password_hash, 15) AS hash_prefix',
    [hash, email]
  );
  console.log(JSON.stringify(result.rows[0] ?? { email, updated: false }));
}

await client.end();
console.log('Done rehashing demo passwords to argon2id.');
