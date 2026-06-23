import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DEMO_EMPLOYER_EMAIL = 'employer@careerhub.dev';
const SEED_FILE = path.resolve('scripts/data/demo-jobs.seed.json');

function parseArgs(argv) {
  const args = { envFile: '.env.prod', dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--env-file') {
      args.envFile = argv[index + 1] ?? args.envFile;
      index += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

function loadEnvFile(envFile) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Env file not found: ${envPath}`);
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function stableUuid(prefix, mockId) {
  const suffix = String(mockId).padStart(12, '0');
  return `${prefix}-${suffix.slice(0, 4)}-${suffix.slice(4, 8)}-${suffix.slice(8, 12)}`;
}

function toJsonArray(values) {
  return JSON.stringify(values ?? []);
}

function toMeiliDocument(job, company) {
  const createdAt = new Date(job.createdAt).getTime();
  const expiresAt = job.expiresAt ? new Date(job.expiresAt).getTime() : null;

  return {
    applicationCount: 0,
    benefits: job.benefits,
    id: job.id,
    category: job.category,
    city: job.city,
    companyId: job.companyId,
    companyIndustry: company.industry,
    companyLogoUrl: null,
    companyName: company.companyName,
    companyWebsite: company.website,
    country: job.country,
    createdAt,
    currency: job.currency,
    description: job.description,
    employerIdentityId: job.employerIdentityId,
    employmentType: job.employmentType,
    experienceLevel: job.experienceLevel,
    expiresAt,
    isRemote: job.isRemote,
    level: job.level,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    salaryMax: job.salaryMax,
    salaryMin: job.salaryMin,
    saturdayPolicy: job.saturdayPolicy,
    slug: job.slug,
    status: job.status,
    title: job.title,
    updatedAt: createdAt
  };
}

async function resolveEmployerIdentityId(iamDatabaseUrl) {
  const pool = new Pool({ connectionString: iamDatabaseUrl });
  try {
    const result = await pool.query(
      'SELECT id FROM identities WHERE lower(email) = lower($1) LIMIT 1',
      [DEMO_EMPLOYER_EMAIL]
    );
    const identityId = result.rows[0]?.id;
    if (!identityId) {
      throw new Error(
        `Demo employer identity not found for ${DEMO_EMPLOYER_EMAIL}. Register the account first.`
      );
    }
    return identityId;
  } finally {
    await pool.end();
  }
}

async function clearJobData(jobDatabaseUrl) {
  const pool = new Pool({ connectionString: jobDatabaseUrl });
  try {
    await pool.query('BEGIN');
    const deletedOutbox = await pool.query('DELETE FROM outbox');
    const deletedJobs = await pool.query('DELETE FROM jobs');
    await pool.query('COMMIT');
    return {
      outbox: deletedOutbox.rowCount ?? 0,
      jobs: deletedJobs.rowCount ?? 0
    };
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

async function insertJobs(jobDatabaseUrl, rows) {
  const pool = new Pool({ connectionString: jobDatabaseUrl });
  try {
    await pool.query('BEGIN');

    for (const row of rows) {
      await pool.query(
        `
          INSERT INTO jobs (
            id,
            employer_identity_id,
            company_id,
            company_name,
            company_logo_url,
            company_industry,
            company_website,
            title,
            slug,
            description,
            responsibilities_json,
            requirements_json,
            benefits_json,
            employment_type,
            level,
            category,
            city,
            country,
            is_remote,
            salary_min,
            salary_max,
            currency,
            saturday_policy,
            experience_level,
            status,
            expires_at,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28
          )
        `,
        [
          row.id,
          row.employerIdentityId,
          row.companyId,
          row.companyName,
          null,
          row.companyIndustry,
          row.companyWebsite,
          row.title,
          row.slug,
          row.description,
          toJsonArray(row.responsibilities),
          toJsonArray(row.requirements),
          toJsonArray(row.benefits),
          row.employmentType,
          row.level,
          row.category,
          row.city,
          row.country,
          row.isRemote,
          row.salaryMin,
          row.salaryMax,
          row.currency,
          row.saturdayPolicy,
          row.experienceLevel,
          row.status,
          row.expiresAt,
          row.createdAt,
          row.updatedAt
        ]
      );
    }

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

async function waitForMeilisearchTask(host, apiKey, taskUid) {
  if (!taskUid) return;

  const baseUrl = host.replace(/\/$/, '');
  const headers = { Authorization: `Bearer ${apiKey}` };
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/tasks/${taskUid}`, { headers });
    const task = await response.json();
    if (task.status === 'succeeded') return;
    if (task.status === 'failed') {
      throw new Error(`Meilisearch task ${taskUid} failed: ${task.error?.message ?? 'unknown'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Meilisearch task ${taskUid}`);
}

async function reindexMeilisearch(host, apiKey, documents) {
  const baseUrl = host.replace(/\/$/, '');
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const indexResponse = await fetch(`${baseUrl}/indexes/jobs`, { headers });
  if (indexResponse.status === 404) {
    await fetch(`${baseUrl}/indexes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid: 'jobs', primaryKey: 'id' })
    });
  }

  await fetch(`${baseUrl}/indexes/jobs/settings/searchable-attributes`, {
    method: 'PUT',
    headers,
    body: JSON.stringify([
      'title',
      'description',
      'companyName',
      'category',
      'city',
      'country'
    ])
  });

  await fetch(`${baseUrl}/indexes/jobs/settings/filterable-attributes`, {
    method: 'PUT',
    headers,
    body: JSON.stringify([
      'status',
      'slug',
      'category',
      'companyIndustry',
      'employmentType',
      'level',
      'isRemote',
      'salaryMin',
      'salaryMax',
      'city',
      'country',
      'saturdayPolicy',
      'experienceLevel'
    ])
  });

  await fetch(`${baseUrl}/indexes/jobs/settings/sortable-attributes`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(['createdAt', 'salaryMin', 'salaryMax'])
  });

  const deleteResponse = await fetch(`${baseUrl}/indexes/jobs/documents`, {
    method: 'DELETE',
    headers
  });
  const deleteTask = await deleteResponse.json();
  await waitForMeilisearchTask(host, apiKey, deleteTask.taskUid);

  if (documents.length === 0) {
    return { indexed: 0 };
  }

  const addResponse = await fetch(`${baseUrl}/indexes/jobs/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify(documents)
  });

  if (!addResponse.ok) {
    const body = await addResponse.text();
    throw new Error(`Meilisearch indexing failed (${addResponse.status}): ${body}`);
  }

  const task = await addResponse.json();
  await waitForMeilisearchTask(host, apiKey, task.taskUid);
  return { indexed: documents.length, taskUid: task.taskUid };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(args.envFile);

  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  const jobDatabaseUrl = requireEnv('JOB_DATABASE_URL');
  const iamDatabaseUrl = requireEnv('IAM_DATABASE_URL');
  const meilisearchHost = requireEnv('MEILISEARCH_HOST');
  const meilisearchApiKey = requireEnv('MEILISEARCH_API_KEY');

  const employerIdentityId = await resolveEmployerIdentityId(iamDatabaseUrl);
  const companiesByMockId = new Map(
    seed.companies.map((company) => [
      company.mockId,
      {
        ...company,
        id: stableUuid('cccccccc-cccc-4ccc-8ccc', company.mockId)
      }
    ])
  );

  const now = new Date();
  const jobRows = seed.jobs.map((job) => {
    const company = companiesByMockId.get(job.companyMockId);
    if (!company) {
      throw new Error(`Missing company mapping for mock company id ${job.companyMockId}`);
    }

    return {
      id: stableUuid('bbbbbbbb-bbbb-4bbb-8bbb', job.mockId),
      employerIdentityId,
      companyId: company.id,
      companyName: company.companyName,
      companyIndustry: company.industry,
      companyWebsite: company.website,
      title: job.title,
      slug: job.slug,
      description: job.description,
      responsibilities: job.responsibilities ?? [],
      requirements: job.requirements ?? [],
      benefits: job.benefits ?? [],
      employmentType: job.employmentType,
      level: job.level,
      category: job.category,
      city: job.city,
      country: job.country,
      isRemote: job.isRemote,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      saturdayPolicy: job.saturdayPolicy ?? 'unspecified',
      experienceLevel: job.experienceLevel ?? 'unspecified',
      status: job.status,
      expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
      createdAt: new Date(job.createdAt),
      updatedAt: now
    };
  });

  const publishedDocuments = jobRows
    .filter((job) => job.status === 'published')
    .map((job) => {
      const company = [...companiesByMockId.values()].find((item) => item.id === job.companyId);
      return toMeiliDocument(job, company);
    });

  console.log(
    JSON.stringify(
      {
        employerIdentityId,
        companies: companiesByMockId.size,
        jobs: jobRows.length,
        publishedForSearch: publishedDocuments.length,
        dryRun: args.dryRun
      },
      null,
      2
    )
  );

  if (args.dryRun) {
    return;
  }

  const deleted = await clearJobData(jobDatabaseUrl);
  console.log(`Deleted ${deleted.jobs} jobs and ${deleted.outbox} outbox rows.`);

  await insertJobs(jobDatabaseUrl, jobRows);
  console.log(`Inserted ${jobRows.length} demo jobs.`);

  const meili = await reindexMeilisearch(
    meilisearchHost,
    meilisearchApiKey,
    publishedDocuments
  );
  console.log(`Indexed ${meili.indexed} published jobs in Meilisearch.`);

  console.log('Demo job seed completed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
