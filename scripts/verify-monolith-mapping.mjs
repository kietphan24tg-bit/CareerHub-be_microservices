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

function legacyId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function combineAddress(city, country) {
  return [city, country].map((value) => value?.trim()).filter(Boolean).join(', ') || null;
}

function toDateIso(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function formatDateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function formatTimeOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }

  const text = String(value);
  return text.length > 8 ? text.slice(0, 8) : text;
}

function minutesBetween(date, startTime, endTime) {
  if (!date || !startTime || !endTime) {
    return null;
  }

  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);
  const diff = end.getTime() - start.getTime();

  if (!Number.isFinite(diff) || diff <= 0) {
    return null;
  }

  return Math.round(diff / 60000);
}

function stableJson(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      return value;
    }
  }

  return JSON.stringify(value);
}

function normalizeValue(value) {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && value !== null) {
    return stableJson(value);
  }

  return value;
}

async function queryAll(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function compareField(sourceValue, targetValue) {
  return normalizeValue(sourceValue) === normalizeValue(targetValue);
}

function createPools() {
  return {
    monolith: new Pool({ connectionString: requireEnv('MONOLITH_DATABASE_URL') }),
    iam: new Pool({ connectionString: process.env.IAM_DIRECT_URL || requireEnv('IAM_DATABASE_URL') }),
    candidate: new Pool({ connectionString: process.env.CANDIDATE_DIRECT_URL || requireEnv('CANDIDATE_DATABASE_URL') }),
    employer: new Pool({ connectionString: process.env.EMPLOYER_DIRECT_URL || requireEnv('EMPLOYER_DATABASE_URL') }),
    job: new Pool({ connectionString: process.env.JOB_DIRECT_URL || requireEnv('JOB_DATABASE_URL') }),
    application: new Pool({ connectionString: process.env.APPLICATION_DIRECT_URL || requireEnv('APPLICATION_DATABASE_URL') }),
    communication: new Pool({ connectionString: process.env.COMMUNICATION_DIRECT_URL || requireEnv('COMMUNICATION_DATABASE_URL') })
  };
}

async function verifyUsers(monolith, iam) {
  const users = await queryAll(monolith, 'select * from users order by id asc');
  const profiles = await queryAll(monolith, 'select user_id from profiles');
  const companies = await queryAll(monolith, 'select user_id from company_profiles');
  const identities = await queryAll(iam, 'select * from identities where id ~ \'^[0-9]+$\' order by id asc');

  const profileUsers = new Set(profiles.map((row) => String(row.user_id)));
  const companyUsers = new Set(companies.map((row) => String(row.user_id)));
  const targetById = new Map(identities.map((row) => [row.id, row]));

  const mismatches = [];

  for (const user of users) {
    const id = legacyId(user.id);
    const target = targetById.get(id);
    if (!target) {
      mismatches.push({ table: 'identities', id, field: 'row', expected: 'present', actual: 'missing' });
      continue;
    }

    const hasProfile = user.role === 'candidate' ? profileUsers.has(id) : companyUsers.has(id);
    let expectedStatus = 'disabled';
    if (user.is_active) {
      expectedStatus = hasProfile ? 'active' : 'pending_profile';
    }

    const checks = [
      ['email', user.email, target.email],
      ['password_hash', user.password_hash, target.password_hash],
      ['role', user.role, target.role],
      ['status', expectedStatus, target.status],
      ['created_at', toDateIso(user.created_at), toDateIso(target.created_at)],
      ['updated_at', toDateIso(user.updated_at), toDateIso(target.updated_at)]
    ];

    for (const [field, expected, actual] of checks) {
      if (!compareField(expected, actual)) {
        mismatches.push({ table: 'identities', id, field, expected, actual });
      }
    }
  }

  return { name: 'iam.identities', sourceCount: users.length, targetCount: identities.length, mismatches };
}

async function verifyCandidateProfiles(monolith, candidate) {
  const profiles = await queryAll(monolith, 'select * from profiles order by id asc');
  const targets = await queryAll(candidate, 'select * from candidate_profiles where id ~ \'^[0-9]+$\' order by id asc');
  const targetById = new Map(targets.map((row) => [row.id, row]));
  const mismatches = [];

  for (const row of profiles) {
    const id = legacyId(row.id);
    const target = targetById.get(id);
    if (!target) {
      mismatches.push({ table: 'candidate_profiles', id, field: 'row', expected: 'present', actual: 'missing' });
      continue;
    }

    const checks = [
      ['identity_id', legacyId(row.user_id), target.identity_id],
      ['full_name', row.full_name, target.full_name],
      ['avatar_url', row.avatar_url, target.avatar_url],
      ['phone', row.phone, target.phone],
      ['headline', row.headline, target.headline],
      ['bio', row.bio, target.bio],
      ['address', combineAddress(row.city, row.country), target.address],
      ['github_url', row.github_url, target.github_url],
      ['linkedin_url', row.linkedin_url, target.linkedin_url],
      ['portfolio_url', row.portfolio_url, target.portfolio_url],
      ['years_experience', row.years_experience, target.years_experience],
      ['resume_id', legacyId(row.resume_id), target.resume_id]
    ];

    for (const [field, expected, actual] of checks) {
      if (!compareField(expected, actual)) {
        mismatches.push({ table: 'candidate_profiles', id, field, expected, actual });
      }
    }
  }

  return { name: 'candidate.candidate_profiles', sourceCount: profiles.length, targetCount: targets.length, mismatches };
}

async function verifyEmployerProfiles(monolith, employer) {
  const companies = await queryAll(monolith, 'select * from company_profiles order by id asc');
  const targets = await queryAll(employer, 'select * from employer_profiles where id ~ \'^[0-9]+$\' order by id asc');
  const targetById = new Map(targets.map((row) => [row.id, row]));
  const mismatches = [];

  for (const row of companies) {
    const id = legacyId(row.id);
    const target = targetById.get(id);
    if (!target) {
      mismatches.push({ table: 'employer_profiles', id, field: 'row', expected: 'present', actual: 'missing' });
      continue;
    }

    const checks = [
      ['identity_id', legacyId(row.user_id), target.identity_id],
      ['company_name', row.company_name, target.company_name],
      ['logo_url', row.logo_url, target.logo_url],
      ['website', row.website, target.website],
      ['industry', row.industry, target.industry],
      ['company_size', row.company_size, target.company_size],
      ['founded_year', row.founded_year, target.founded_year],
      ['description', row.description, target.description],
      ['address', combineAddress(row.city, row.country), target.address],
      ['tax_code', row.tax_code, target.tax_code]
    ];

    for (const [field, expected, actual] of checks) {
      if (!compareField(expected, actual)) {
        mismatches.push({ table: 'employer_profiles', id, field, expected, actual });
      }
    }
  }

  return { name: 'employer.employer_profiles', sourceCount: companies.length, targetCount: targets.length, mismatches };
}

async function verifyJobs(monolith, jobDb) {
  const companies = await queryAll(monolith, 'select * from company_profiles');
  const jobs = await queryAll(monolith, 'select * from jobs order by id asc');
  const targets = await queryAll(jobDb, 'select * from jobs where id ~ \'^[0-9]+$\' order by id asc');
  const companyById = new Map(companies.map((row) => [legacyId(row.id), row]));
  const targetById = new Map(targets.map((row) => [row.id, row]));
  const mismatches = [];

  for (const row of jobs) {
    const id = legacyId(row.id);
    const target = targetById.get(id);
    if (!target) {
      mismatches.push({ table: 'jobs', id, field: 'row', expected: 'present', actual: 'missing' });
      continue;
    }
    const company = companyById.get(legacyId(row.company_id));
    const checks = [
      ['employer_identity_id', legacyId(company?.user_id), target.employer_identity_id],
      ['company_id', legacyId(row.company_id), target.company_id],
      ['company_name', company?.company_name, target.company_name],
      ['title', row.title, target.title],
      ['slug', row.slug, target.slug],
      ['description', row.description, target.description],
      ['employment_type', row.employment_type, target.employment_type],
      ['level', row.level, target.level],
      ['category', row.category, target.category],
      ['city', row.city, target.city],
      ['country', row.country, target.country],
      ['is_remote', Boolean(row.is_remote), target.is_remote],
      ['salary_min', row.salary_min, target.salary_min],
      ['salary_max', row.salary_max, target.salary_max],
      ['currency', row.currency, target.currency],
      ['status', row.status, target.status]
    ];
    for (const [field, expected, actual] of checks) {
      if (!compareField(expected, actual)) {
        mismatches.push({ table: 'jobs', id, field, expected, actual });
      }
    }
  }

  return { name: 'job.jobs', sourceCount: jobs.length, targetCount: targets.length, mismatches };
}

async function verifyApplications(monolith, applicationDb) {
  const companies = await queryAll(monolith, 'select * from company_profiles');
  const jobs = await queryAll(monolith, 'select * from jobs');
  const applications = await queryAll(monolith, 'select * from applications order by id asc');
  const targets = await queryAll(applicationDb, 'select * from applications where id ~ \'^[0-9]+$\' order by id asc');
  const companyById = new Map(companies.map((row) => [legacyId(row.id), row]));
  const jobById = new Map(jobs.map((row) => [legacyId(row.id), row]));
  const targetById = new Map(targets.map((row) => [row.id, row]));
  const mismatches = [];

  for (const row of applications) {
    const id = legacyId(row.id);
    const target = targetById.get(id);
    if (!target) {
      mismatches.push({ table: 'applications', id, field: 'row', expected: 'present', actual: 'missing' });
      continue;
    }
    const job = jobById.get(legacyId(row.job_id));
    const company = companyById.get(legacyId(job?.company_id));
    const checks = [
      ['job_id', legacyId(row.job_id), target.job_id],
      ['candidate_identity_id', legacyId(row.candidate_user_id), target.candidate_identity_id],
      ['employer_identity_id', legacyId(company?.user_id), target.employer_identity_id],
      ['resume_id', legacyId(row.resume_id), target.resume_id],
      ['cover_letter', row.cover_letter, target.cover_letter],
      ['status', row.status, target.status]
    ];
    for (const [field, expected, actual] of checks) {
      if (!compareField(expected, actual)) {
        mismatches.push({ table: 'applications', id, field, expected, actual });
      }
    }
  }

  return { name: 'application.applications', sourceCount: applications.length, targetCount: targets.length, mismatches };
}

async function verifyInterviews(monolith, applicationDb) {
  const companies = await queryAll(monolith, 'select * from company_profiles');
  const interviews = await queryAll(monolith, 'select * from interviews order by id asc');
  const targets = await queryAll(applicationDb, 'select * from interviews where id ~ \'^[0-9]+$\' order by id asc');
  const companyById = new Map(companies.map((row) => [legacyId(row.id), row]));
  const targetById = new Map(targets.map((row) => [row.id, row]));
  const mismatches = [];

  for (const row of interviews) {
    const id = legacyId(row.id);
    const target = targetById.get(id);
    if (!target) {
      mismatches.push({ table: 'interviews', id, field: 'row', expected: 'present', actual: 'missing' });
      continue;
    }
    const company = companyById.get(legacyId(row.company_id));
    const checks = [
      ['application_id', legacyId(row.application_id), target.application_id],
      ['job_id', legacyId(row.job_id), target.job_id],
      ['candidate_identity_id', legacyId(row.candidate_user_id), target.candidate_identity_id],
      ['employer_identity_id', legacyId(company?.user_id), target.employer_identity_id],
      ['scheduled_by_identity_id', legacyId(row.scheduled_by_user_id), target.scheduled_by_identity_id],
      ['type', row.type, target.type],
      ['round', row.round, target.round],
      ['status', row.status, target.status],
      ['date', formatDateOnly(row.date), target.date],
      ['start_time', formatTimeOnly(row.start_time), target.start_time],
      ['end_time', formatTimeOnly(row.end_time), target.end_time],
      ['duration_minutes', minutesBetween(row.date, row.start_time, row.end_time), target.duration_minutes],
      ['timezone', row.timezone, target.timezone],
      ['interviewer_name', row.interviewer_name, target.interviewer_name],
      ['interviewer_role', row.interviewer_role, target.interviewer_role],
      ['notes_to_candidate', row.notes_to_candidate, target.notes_to_candidate],
      ['platform', row.platform, target.platform],
      ['meeting_link', row.meeting_link, target.meeting_link]
    ];
    for (const [field, expected, actual] of checks) {
      if (!compareField(expected, actual)) {
        mismatches.push({ table: 'interviews', id, field, expected, actual });
      }
    }
  }

  return { name: 'application.interviews', sourceCount: interviews.length, targetCount: targets.length, mismatches };
}

async function verifyJobOffers(monolith, applicationDb) {
  const companies = await queryAll(monolith, 'select * from company_profiles');
  const offers = await queryAll(monolith, 'select * from job_offers order by id asc');
  const targets = await queryAll(applicationDb, 'select * from job_offers where id ~ \'^[0-9]+$\' order by id asc');
  const companyById = new Map(companies.map((row) => [legacyId(row.id), row]));
  const targetById = new Map(targets.map((row) => [row.id, row]));
  const mismatches = [];

  for (const row of offers) {
    const id = legacyId(row.id);
    const target = targetById.get(id);
    if (!target) {
      mismatches.push({ table: 'job_offers', id, field: 'row', expected: 'present', actual: 'missing' });
      continue;
    }
    const company = companyById.get(legacyId(row.company_id));
    const checks = [
      ['application_id', legacyId(row.application_id), target.application_id],
      ['job_id', legacyId(row.job_id), target.job_id],
      ['candidate_identity_id', legacyId(row.candidate_user_id), target.candidate_identity_id],
      ['employer_identity_id', legacyId(company?.user_id), target.employer_identity_id],
      ['title', row.title, target.title],
      ['seniority_label', row.seniority_label, target.seniority_label],
      ['message', row.message, target.message],
      ['bonus_details', row.bonus_details, target.bonus_details],
      ['contract_document_url', row.contract_document_url, target.contract_document_url],
      ['currency', row.currency, target.currency],
      ['employment_type', row.employment_type, target.employment_type],
      ['work_model', row.work_model, target.work_model],
      ['start_date', formatDateOnly(row.start_date), target.start_date],
      ['location', row.location, target.location],
      ['status', row.status, target.status],
      ['created_by_identity_id', legacyId(row.created_by_user_id), target.created_by_identity_id]
    ];
    for (const [field, expected, actual] of checks) {
      if (!compareField(expected, actual)) {
        mismatches.push({ table: 'job_offers', id, field, expected, actual });
      }
    }
  }

  return { name: 'application.job_offers', sourceCount: offers.length, targetCount: targets.length, mismatches };
}

async function verifyNotifications(monolith, communicationDb) {
  const notifications = await queryAll(monolith, 'select * from notifications order by id asc');
  const targets = await queryAll(communicationDb, 'select * from notifications where id ~ \'^[0-9]+$\' order by id asc');
  const targetById = new Map(targets.map((row) => [row.id, row]));
  const mismatches = [];

  for (const row of notifications) {
    const id = legacyId(row.id);
    const target = targetById.get(id);
    if (!target) {
      mismatches.push({ table: 'notifications', id, field: 'row', expected: 'present', actual: 'missing' });
      continue;
    }

    const checks = [
      ['identity_id', legacyId(row.user_id), target.identity_id],
      ['type', row.type ?? 'generic', target.type],
      ['title', row.title ?? '', target.title],
      ['message', row.message ?? '', target.message],
      ['metadata_json', stableJson(row.metadata), stableJson(target.metadata_json)]
    ];
    for (const [field, expected, actual] of checks) {
      if (!compareField(expected, actual)) {
        mismatches.push({ table: 'notifications', id, field, expected, actual });
      }
    }
  }

  return { name: 'communication.notifications', sourceCount: notifications.length, targetCount: targets.length, mismatches };
}

function printSummary(result) {
  console.log(`\n=== ${result.name} ===`);
  console.log(`source: ${result.sourceCount}`);
  console.log(`target-matched-scope: ${result.targetCount}`);
  console.log(`mismatches: ${result.mismatches.length}`);
  for (const item of result.mismatches.slice(0, 20)) {
    console.log(`- [${item.table}] id=${item.id} field=${item.field} expected=${JSON.stringify(item.expected)} actual=${JSON.stringify(item.actual)}`);
  }
  if (result.mismatches.length > 20) {
    console.log(`- ... ${result.mismatches.length - 20} more mismatches`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFile(options.envFile);
  const pools = createPools();
  try {
    const results = [];
    results.push(await verifyUsers(pools.monolith, pools.iam));
    results.push(await verifyCandidateProfiles(pools.monolith, pools.candidate));
    results.push(await verifyEmployerProfiles(pools.monolith, pools.employer));
    results.push(await verifyJobs(pools.monolith, pools.job));
    results.push(await verifyApplications(pools.monolith, pools.application));
    results.push(await verifyInterviews(pools.monolith, pools.application));
    results.push(await verifyJobOffers(pools.monolith, pools.application));
    results.push(await verifyNotifications(pools.monolith, pools.communication));

    for (const result of results) {
      printSummary(result);
    }
  } finally {
    await Promise.allSettled(Object.values(pools).map((pool) => pool.end()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
