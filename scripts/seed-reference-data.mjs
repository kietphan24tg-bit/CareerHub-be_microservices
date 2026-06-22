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

function createTemplateLayout(title, headline, accent) {
  return {
    accent,
    header: {
      title: {
        fieldKey: 'full_name',
        placeholder: 'Nguyen Van A'
      },
      subtitle: {
        fieldKey: 'headline',
        placeholder: headline
      },
      main: {
        title: {
          fieldKey: 'title',
          placeholder: title
        }
      }
    },
    sections: [
      {
        source: 'resume_experiences',
        title: 'Kinh nghiem',
        sampleItems: [
          {
            company_name: 'CareerHub',
            description: 'Xay dung backend microservices va toi uu hoa API.',
            employment_type: 'full_time',
            end_date: '',
            is_current: true,
            position: 'Backend Engineer',
            start_date: '2024-01-01',
            tech_stack: 'Node.js, NestJS, PostgreSQL'
          }
        ]
      },
      {
        source: 'resume_educations',
        title: 'Hoc van',
        sampleItems: [
          {
            degree: 'Cu nhan',
            end_date: '2024-06-01',
            major: 'Cong nghe thong tin',
            school_name: 'Dai hoc',
            start_date: '2020-09-01'
          }
        ]
      },
      {
        source: 'resume_skills',
        title: 'Ky nang',
        sampleItems: [
          {
            category: 'technical',
            level: 'advanced',
            name: 'Node.js',
            sort_order: 1
          },
          {
            category: 'technical',
            level: 'advanced',
            name: 'PostgreSQL',
            sort_order: 2
          }
        ]
      }
    ],
    version: 1
  };
}

const RESUME_TEMPLATES = [
  {
    id: '1',
    name: 'Classic Professional',
    category: 'professional',
    thumbnail: null,
    layout_data: createTemplateLayout(
      'Backend Engineer',
      'Professional resume',
      '#24344d'
    )
  },
  {
    id: '2',
    name: 'Olive Minimal',
    category: 'minimal',
    thumbnail: null,
    layout_data: createTemplateLayout(
      'Product Designer',
      'Minimal resume',
      '#556252'
    )
  },
  {
    id: '3',
    name: 'Forest Editorial',
    category: 'editorial',
    thumbnail: null,
    layout_data: createTemplateLayout(
      'Frontend Developer',
      'Editorial resume',
      '#556252'
    )
  },
  {
    id: '4',
    name: 'Skyline Modern',
    category: 'modern',
    thumbnail: null,
    layout_data: createTemplateLayout(
      'Data Analyst',
      'Modern resume',
      '#56b5e6'
    )
  },
  {
    id: '5',
    name: 'Bold Portfolio',
    category: 'creative',
    thumbnail: null,
    layout_data: createTemplateLayout(
      'Full Stack Engineer',
      'Creative resume',
      '#56b5e6'
    )
  }
];

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
