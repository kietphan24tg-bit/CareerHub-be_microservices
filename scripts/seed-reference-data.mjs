import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

function parseArgs(argv) {
  const args = {
    envFile: '.env.prod'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--env-file') {
      args.envFile = argv[index + 1] ?? args.envFile;
      index += 1;
    }
  }

  return args;
}

function loadEnvFile(envFile) {
  const envPath = path.resolve(process.cwd(), envFile);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

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

async function upsertRows(client, tableName, conflictColumns, rows) {
  if (rows.length === 0) {
    return;
  }

  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map((column) => `"${column}"`).join(', ');
  const conflictClause = conflictColumns.map((column) => `"${column}"`).join(', ');
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));
  const updateClause = updateColumns
    .map((column) => `"${column}" = EXCLUDED."${column}"`)
    .join(', ');

  for (const row of rows) {
    const values = columns.map((column) => row[column]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    await client.query(
      `
        insert into "${tableName}" (${quotedColumns})
        values (${placeholders})
        on conflict (${conflictClause}) do update set ${updateClause}
      `,
      values
    );
  }
}

function normalizeAssetUrls(value) {
  if (typeof value === 'string') {
    return value
      .replaceAll('http://localhost:4000/templates/', '/templates/')
      .replaceAll('https://localhost:4000/templates/', '/templates/');
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeAssetUrls(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeAssetUrls(entry)])
    );
  }

  return value;
}

const TEMPLATE_META = [
  { id: '1', name: 'Classic Professional', category: 'professional' },
  { id: '2', name: 'Olive Minimal', category: 'minimal' },
  { id: '3', name: 'Forest Editorial', category: 'editorial' },
  { id: '4', name: 'Skyline Modern', category: 'modern' },
  { id: '5', name: 'Bold Portfolio', category: 'creative' }
];

function loadResumeTemplatesFromFixtures() {
  const fixturesDir = path.resolve(
    process.cwd(),
    '../CareerHub-fe/tests/e2e/fixtures/live-templates-raw'
  );

  return TEMPLATE_META.map((meta) => {
    const fixturePath = path.join(fixturesDir, `template-${meta.id}.json`);

    if (!fs.existsSync(fixturePath)) {
      throw new Error(`Missing resume template fixture: ${fixturePath}`);
    }

    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    return {
      id: meta.id,
      name: meta.name,
      category: meta.category,
      thumbnail: `/templates/thumbnails/resume_template_${meta.id}.webp`,
      layout_data: normalizeAssetUrls(fixture.data.layoutData),
      is_active: true
    };
  });
}

const RESUME_TEMPLATES = loadResumeTemplatesFromFixtures();

const BENEFIT_CATALOGS = [
  {
    id: 'bc-private_healthcare',
    code: 'private_healthcare',
    label: 'Private Healthcare',
    description: 'Healthcare benefit provided by employer.',
    has_monetary_value_default: false,
    requires_amount: false,
    requires_frequency: false,
    requires_annual_leave_days: false,
    is_active: true,
    is_selectable: true,
    sort_order: 10
  },
  {
    id: 'bc-learning_budget',
    code: 'learning_budget',
    label: 'Learning Budget',
    description: 'Budget for courses, books or professional growth.',
    has_monetary_value_default: true,
    requires_amount: true,
    requires_frequency: true,
    requires_annual_leave_days: false,
    is_active: true,
    is_selectable: true,
    sort_order: 20
  },
  {
    id: 'bc-training_budget',
    code: 'training_budget',
    label: 'Training Budget',
    description: 'Budget for training programs and certifications.',
    has_monetary_value_default: true,
    requires_amount: true,
    requires_frequency: true,
    requires_annual_leave_days: false,
    is_active: true,
    is_selectable: true,
    sort_order: 30
  },
  {
    id: 'bc-hybrid_work_setup',
    code: 'hybrid_work_setup',
    label: 'Hybrid Work Setup',
    description: 'Support for hybrid or flexible work arrangements.',
    has_monetary_value_default: false,
    requires_amount: false,
    requires_frequency: false,
    requires_annual_leave_days: false,
    is_active: true,
    is_selectable: true,
    sort_order: 40
  },
  {
    id: 'bc-flexible_work_setup',
    code: 'flexible_work_setup',
    label: 'Flexible Work Setup',
    description: 'Flexible schedule or work setup benefit.',
    has_monetary_value_default: false,
    requires_amount: false,
    requires_frequency: false,
    requires_annual_leave_days: false,
    is_active: true,
    is_selectable: true,
    sort_order: 50
  },
  {
    id: 'bc-remote_allowance',
    code: 'remote_allowance',
    label: 'Remote Work Allowance',
    description: 'Allowance for remote work equipment or expenses.',
    has_monetary_value_default: true,
    requires_amount: true,
    requires_frequency: true,
    requires_annual_leave_days: false,
    is_active: true,
    is_selectable: true,
    sort_order: 60
  },
  {
    id: 'bc-annual_leave',
    code: 'annual_leave',
    label: 'Annual Leave',
    description: 'Paid leave benefit counted in days per year.',
    has_monetary_value_default: false,
    requires_amount: false,
    requires_frequency: false,
    requires_annual_leave_days: true,
    is_active: true,
    is_selectable: true,
    sort_order: 70
  },
  {
    id: 'bc-thirteenth_month',
    code: 'thirteenth_month',
    label: '13th Month Salary',
    description: 'Additional yearly salary payment.',
    has_monetary_value_default: false,
    requires_amount: false,
    requires_frequency: false,
    requires_annual_leave_days: false,
    is_active: true,
    is_selectable: true,
    sort_order: 80
  }
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(args.envFile);
  const now = new Date();

  const candidatePool = new Pool({
    connectionString: requireEnv('CANDIDATE_DATABASE_URL'),
    ssl: { rejectUnauthorized: false }
  });
  const applicationPool = new Pool({
    connectionString: requireEnv('APPLICATION_DATABASE_URL'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    const candidateClient = await candidatePool.connect();
    try {
      await upsertRows(candidateClient, 'resume_templates', ['id'], RESUME_TEMPLATES);
      const normalizedResumes = await candidateClient.query(
        `
          update resumes
          set template_id = '1'
          where template_id is null
             or template_id = 'resume-template-classic-1'
        `
      );
      await candidateClient.query(
        `
          update resume_templates
          set is_active = false
          where id = 'resume-template-classic-1'
        `
      );
      console.log(`seeded resume_templates: ${RESUME_TEMPLATES.length}`);
      console.log(`normalized resumes.template_id: ${normalizedResumes.rowCount ?? 0}`);
    } finally {
      candidateClient.release();
    }

    const applicationClient = await applicationPool.connect();
    try {
      await upsertRows(
        applicationClient,
        'benefit_catalogs',
        ['code'],
        BENEFIT_CATALOGS.map((item) => ({
          ...item,
          updated_at: now
        }))
      );
      console.log(`seeded benefit_catalogs: ${BENEFIT_CATALOGS.length}`);
    } finally {
      applicationClient.release();
    }
  } finally {
    await Promise.all([candidatePool.end(), applicationPool.end()]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
