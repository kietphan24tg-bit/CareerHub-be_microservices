import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DOMAIN_ORDER = [
  'iam',
  'employer',
  'candidate',
  'job',
  'application',
  'communication'
];

function parseArgs(argv) {
  const args = {
    domains: [...DOMAIN_ORDER],
    dryRun: false,
    envFile: '.env.prod'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--domains') {
      const raw = argv[index + 1] ?? '';
      args.domains = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }

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

function requireEnv(name, options = {}) {
  const value = process.env[name]?.trim();

  if (!value && !options.optional) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value || '';
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

function toNullableText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function formatDateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 32);
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

function toJsonString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function toDate(value) {
  return value ? new Date(value) : null;
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

function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `select to_regclass($1) as value`,
    [`public.${tableName}`]
  );

  return Boolean(result.rows[0]?.value);
}

async function loadTable(client, tableName, orderBy = 'id') {
  if (!(await tableExists(client, tableName))) {
    return [];
  }

  const result = await client.query(`select * from "${tableName}" order by "${orderBy}" asc`);
  return result.rows;
}

async function loadOptionalTable(client, tableName, orderBy = 'id') {
  return loadTable(client, tableName, orderBy);
}

async function loadColumnSet(client, tableName) {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
    `,
    [tableName]
  );

  return new Set(result.rows.map((row) => row.column_name));
}

async function upsertRows(client, tableName, conflictColumns, rows, context) {
  if (rows.length === 0) {
    context.log(`skip ${tableName}: no rows`);
    return 0;
  }

  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map((column) => `"${column}"`).join(', ');
  const conflictClause = conflictColumns.map((column) => `"${column}"`).join(', ');
  const updateColumns = columns.filter(
    (column) => !conflictColumns.includes(column)
  );
  const updateClause =
    updateColumns.length === 0
      ? 'DO NOTHING'
      : `DO UPDATE SET ${updateColumns
          .map((column) => `"${column}" = EXCLUDED."${column}"`)
          .join(', ')}`;

  if (context.dryRun) {
    context.log(`[dry-run] ${tableName}: ${rows.length} rows`);
    return rows.length;
  }

  for (const row of rows) {
    const values = columns.map((column) => row[column]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    await client.query(
      `
        insert into "${tableName}" (${quotedColumns})
        values (${placeholders})
        on conflict (${conflictClause}) ${updateClause}
      `,
      values
    );
  }

  context.log(`${tableName}: ${rows.length} rows`);
  return rows.length;
}

function createContext(options) {
  return {
    dryRun: options.dryRun,
    log(message) {
      console.log(message);
    }
  };
}

async function migrateIam(sourcePool, targetPool, context) {
  const source = await sourcePool.connect();
  const target = await targetPool.connect();

  try {
    const users = await loadTable(source, 'users');
    const profiles = await loadOptionalTable(source, 'profiles');
    const companies = await loadOptionalTable(source, 'company_profiles');
    const authSessionColumns =
      (await tableExists(source, 'auth_sessions'))
        ? await loadColumnSet(source, 'auth_sessions')
        : new Set();
    const passwordResetColumns =
      (await tableExists(source, 'password_resets'))
        ? await loadColumnSet(source, 'password_resets')
        : new Set();

    const profileUsers = new Set(profiles.map((row) => String(row.user_id)));
    const companyUsers = new Set(companies.map((row) => String(row.user_id)));

    const identityRows = users.map((row) => {
      const identityId = legacyId(row.id);
      const hasProfile =
        row.role === 'candidate'
          ? profileUsers.has(identityId)
          : companyUsers.has(identityId);

      let status = 'disabled';
      if (row.is_active) {
        status = hasProfile ? 'active' : 'pending_profile';
      }

      return {
        id: identityId,
        email: row.email,
        password_hash: row.password_hash,
        role: row.role,
        status,
        accepted_terms: true,
        created_at: toDate(row.created_at),
        updated_at: toDate(row.updated_at)
      };
    });

    await upsertRows(target, 'identities', ['id'], identityRows, context);

    if (authSessionColumns.has('token_hash')) {
      const authSessions = await loadOptionalTable(source, 'auth_sessions');
      const sessionRows = authSessions.map((row) => ({
        id: legacyId(row.id),
        identity_id: legacyId(row.user_id ?? row.identity_id),
        token_hash: row.token_hash,
        remember_me: Boolean(row.remember_me),
        expires_at: toDate(row.expires_at),
        revoked_at: toDate(row.revoked_at),
        created_at: toDate(row.created_at),
        updated_at: toDate(row.updated_at)
      }));

      await upsertRows(target, 'auth_sessions', ['id'], sessionRows, context);
    } else {
      context.log('skip auth_sessions: source token_hash column not found');
    }

    if (passwordResetColumns.has('token_hash')) {
      const passwordResets = await loadOptionalTable(source, 'password_resets');
      const resetRows = passwordResets.map((row) => ({
        id: legacyId(row.id),
        identity_id: legacyId(row.user_id ?? row.identity_id),
        token_hash: row.token_hash,
        expires_at: toDate(row.expires_at),
        used_at: toDate(row.used_at),
        mail_processing_at: toDate(row.mail_processing_at),
        mail_sent_at: toDate(row.mail_sent_at),
        created_at: toDate(row.created_at)
      }));

      await upsertRows(
        target,
        'password_reset_tokens',
        ['id'],
        resetRows,
        context
      );
    } else {
      context.log('skip password_reset_tokens: source token_hash column not found');
    }
  } finally {
    source.release();
    target.release();
  }
}

async function migrateCandidate(sourcePool, targetPool, context) {
  const source = await sourcePool.connect();
  const target = await targetPool.connect();

  try {
    const profiles = await loadOptionalTable(source, 'profiles');
    const resumes = await loadOptionalTable(source, 'resumes');
    const savedJobs = await loadOptionalTable(source, 'saved_jobs');
    const resumeSkills = await loadOptionalTable(source, 'resume_skills');
    const resumeEducations = await loadOptionalTable(source, 'resume_educations');
    const resumeExperiences = await loadOptionalTable(source, 'resume_experiences');
    const resumeProjects = await loadOptionalTable(source, 'resume_projects');
    const resumeCertifications = await loadOptionalTable(
      source,
      'resume_certifications'
    );
    const resumeAwards = await loadOptionalTable(source, 'resume_awards');

    const groupedByResumeId = (rows) => {
      const map = new Map();

      for (const row of rows) {
        const key = legacyId(row.resume_id);
        if (!map.has(key)) {
          map.set(key, []);
        }

        map.get(key).push(row);
      }

      return map;
    };

    const skillsByResume = groupedByResumeId(resumeSkills);
    const educationsByResume = groupedByResumeId(resumeEducations);
    const experiencesByResume = groupedByResumeId(resumeExperiences);
    const projectsByResume = groupedByResumeId(resumeProjects);
    const certificationsByResume = groupedByResumeId(resumeCertifications);
    const awardsByResume = groupedByResumeId(resumeAwards);

    const profileRows = profiles.map((row) => ({
      id: legacyId(row.id),
      identity_id: legacyId(row.user_id),
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      phone: row.phone,
      headline: row.headline,
      bio: row.bio,
      address: combineAddress(row.city, row.country),
      github_url: row.github_url,
      linkedin_url: row.linkedin_url,
      portfolio_url: row.portfolio_url,
      years_experience: row.years_experience,
      resume_id: legacyId(row.resume_id),
      created_at: toDate(row.created_at),
      updated_at: toDate(row.updated_at)
    }));

    const resumeRows = resumes.map((row) => ({
      id: legacyId(row.id),
      identity_id: legacyId(row.user_id),
      template_id: null,
      title: row.title,
      is_using: Boolean(row.is_default),
      content: {
        summary: row.summary ?? null,
        skills: (skillsByResume.get(legacyId(row.id)) ?? []).map((item) =>
          compactObject({
            id: legacyId(item.id),
            name: item.name,
            category: item.category,
            level: item.level,
            sortOrder: item.sort_order ?? null
          })
        ),
        educations: (educationsByResume.get(legacyId(row.id)) ?? []).map((item) =>
          compactObject({
            id: legacyId(item.id),
            schoolName: item.school_name,
            degree: item.degree,
            major: item.major,
            startDate: item.start_date,
            endDate: item.end_date,
            gpa: item.gpa,
            description: item.description,
            sortOrder: item.sort_order ?? null
          })
        ),
        experiences: (experiencesByResume.get(legacyId(row.id)) ?? []).map((item) =>
          compactObject({
            id: legacyId(item.id),
            companyName: item.company_name,
            role: item.role,
            employmentType: item.employment_type,
            startDate: item.start_date,
            endDate: item.end_date,
            isCurrent: item.is_current ?? null,
            description: item.description,
            achievements: item.achievements,
            sortOrder: item.sort_order ?? null
          })
        ),
        projects: (projectsByResume.get(legacyId(row.id)) ?? []).map((item) =>
          compactObject({
            id: legacyId(item.id),
            name: item.name,
            role: item.role,
            description: item.description,
            startDate: item.start_date,
            endDate: item.end_date,
            projectUrl: item.project_url,
            repositoryUrl: item.repository_url,
            sortOrder: item.sort_order ?? null
          })
        ),
        certifications: (
          certificationsByResume.get(legacyId(row.id)) ?? []
        ).map((item) =>
          compactObject({
            id: legacyId(item.id),
            name: item.name,
            issuer: item.issuer,
            issueDate: item.issue_date,
            expiryDate: item.expiry_date,
            credentialId: item.credential_id,
            credentialUrl: item.credential_url,
            sortOrder: item.sort_order ?? null
          })
        ),
        awards: (awardsByResume.get(legacyId(row.id)) ?? []).map((item) =>
          compactObject({
            id: legacyId(item.id),
            name: item.name,
            issuer: item.issuer,
            year: item.year,
            description: item.description,
            sortOrder: item.sort_order ?? null
          })
        )
      },
      created_at: toDate(row.created_at),
      updated_at: toDate(row.updated_at)
    }));

    const savedJobRows = savedJobs.map((row) => ({
      id: legacyId(row.id),
      identity_id: legacyId(row.user_id),
      job_id: legacyId(row.job_id),
      created_at: toDate(row.created_at)
    }));

    await upsertRows(target, 'candidate_profiles', ['id'], profileRows, context);
    await upsertRows(target, 'resumes', ['id'], resumeRows, context);
    await upsertRows(target, 'saved_jobs', ['id'], savedJobRows, context);
    context.log('skip resume_templates: no equivalent source table in monolith schema');
  } finally {
    source.release();
    target.release();
  }
}

async function migrateEmployer(sourcePool, targetPool, context) {
  const source = await sourcePool.connect();
  const target = await targetPool.connect();

  try {
    const companies = await loadOptionalTable(source, 'company_profiles');

    const rows = companies.map((row) => ({
      id: legacyId(row.id),
      identity_id: legacyId(row.user_id),
      company_name: row.company_name,
      logo_url: row.logo_url,
      website: row.website,
      industry: row.industry,
      company_size: row.company_size,
      founded_year: row.founded_year,
      description: row.description,
      address: combineAddress(row.city, row.country),
      tax_code: row.tax_code,
      contact_name: null,
      contact_phone: null,
      created_at: toDate(row.created_at),
      updated_at: toDate(row.updated_at)
    }));

    await upsertRows(target, 'employer_profiles', ['id'], rows, context);
  } finally {
    source.release();
    target.release();
  }
}

async function migrateJob(sourcePool, targetPool, context) {
  const source = await sourcePool.connect();
  const target = await targetPool.connect();

  try {
    const companies = await loadOptionalTable(source, 'company_profiles');
    const jobs = await loadOptionalTable(source, 'jobs');
    const companyById = new Map(companies.map((row) => [legacyId(row.id), row]));

    const rows = jobs.map((row) => {
      const company = companyById.get(legacyId(row.company_id));

      if (!company) {
        throw new Error(`Missing company_profiles row for job ${row.id}`);
      }

      return {
        id: legacyId(row.id),
        employer_identity_id: legacyId(company.user_id),
        company_id: legacyId(company.id),
        company_name: company.company_name,
        company_logo_url: company.logo_url,
        company_industry: company.industry,
        company_website: company.website,
        title: row.title,
        slug: row.slug,
        description: row.description,
        responsibilities_json: row.responsibilities,
        requirements_json: row.requirements,
        benefits_json: row.benefits,
        employment_type: row.employment_type,
        level: row.level,
        category: row.category,
        city: row.city,
        country: row.country,
        is_remote: Boolean(row.is_remote),
        salary_min: row.salary_min,
        salary_max: row.salary_max,
        currency: row.currency,
        status: row.status,
        expires_at: toDate(row.expires_at),
        created_at: toDate(row.created_at),
        updated_at: toDate(row.updated_at)
      };
    });

    await upsertRows(target, 'jobs', ['id'], rows, context);
  } finally {
    source.release();
    target.release();
  }
}

async function migrateApplication(sourcePool, targetPool, context) {
  const source = await sourcePool.connect();
  const target = await targetPool.connect();

  try {
    const companies = await loadOptionalTable(source, 'company_profiles');
    const jobs = await loadOptionalTable(source, 'jobs');
    const applications = await loadOptionalTable(source, 'applications');
    const histories = await loadOptionalTable(source, 'application_histories');
    const interviews = await loadOptionalTable(source, 'interviews');
    const offers = await loadOptionalTable(source, 'job_offers');
    const recruiterNotes = await loadOptionalTable(source, 'recruiter_notes');

    const companyById = new Map(companies.map((row) => [legacyId(row.id), row]));
    const jobById = new Map(jobs.map((row) => [legacyId(row.id), row]));
    const applicationById = new Map(
      applications.map((row) => [legacyId(row.id), row])
    );

    const applicationRows = applications.map((row) => {
      const job = jobById.get(legacyId(row.job_id));
      const company = companyById.get(legacyId(job?.company_id));

      if (!job || !company) {
        throw new Error(`Missing job/company for application ${row.id}`);
      }

      return {
        id: legacyId(row.id),
        job_id: legacyId(row.job_id),
        candidate_identity_id: legacyId(row.candidate_user_id),
        employer_identity_id: legacyId(company.user_id),
        resume_id: legacyId(row.resume_id),
        cover_letter: row.cover_letter,
        status: row.status,
        created_at: toDate(row.applied_at ?? row.created_at),
        updated_at: toDate(row.updated_at)
      };
    });

    const historyRows = histories.map((row) => {
      const application = applicationById.get(legacyId(row.application_id));
      const job = jobById.get(legacyId(application?.job_id));
      const company = companyById.get(legacyId(job?.company_id));
      const actorIdentityId = legacyId(row.changed_by_user_id);
      let actorType = 'system';

      if (application && actorIdentityId === legacyId(application.candidate_user_id)) {
        actorType = 'candidate';
      } else if (company && actorIdentityId === legacyId(company.user_id)) {
        actorType = 'employer';
      }

      return {
        id: legacyId(row.id),
        application_id: legacyId(row.application_id),
        event_type: row.event_type ?? 'status_change',
        from_status: row.old_status ?? null,
        note: row.note,
        to_status: row.new_status ?? row.status ?? 'applied',
        actor_identity_id: actorIdentityId,
        actor_type: actorType,
        created_at: toDate(row.created_at)
      };
    });

    const interviewRows = interviews.map((row) => {
      const company = companyById.get(legacyId(row.company_id));
      const durationMinutes = minutesBetween(
        row.date,
        row.start_time,
        row.end_time
      );
      const logisticsParts = [
        row.reception_note,
        row.arrival_instructions,
        row.parking_info
      ]
        .map(toNullableText)
        .filter(Boolean);

      return {
        id: legacyId(row.id),
        application_id: legacyId(row.application_id),
        job_id: legacyId(row.job_id),
        candidate_identity_id: legacyId(row.candidate_user_id),
        employer_identity_id: legacyId(company?.user_id),
        scheduled_by_identity_id: legacyId(row.scheduled_by_user_id),
        type: row.type,
        round: row.round,
        status: row.status,
        date: formatDateOnly(row.date),
        start_time: formatTimeOnly(row.start_time),
        end_time: formatTimeOnly(row.end_time),
        duration_minutes: durationMinutes,
        timezone: row.timezone,
        interviewer_name: row.interviewer_name,
        interviewer_role: row.interviewer_role,
        interviewers: null,
        notes_to_candidate: row.notes_to_candidate,
        logistics_note: logisticsParts.join('\n') || null,
        platform: row.platform,
        meeting_link: row.meeting_link,
        meeting_id: row.meeting_id,
        passcode: row.passcode,
        office_name: row.office_name,
        full_address: row.full_address,
        location_detail: toNullableText(row.floor_room),
        location_lat: null,
        location_lng: null,
        map_link: row.map_link,
        caller_info: row.caller_info,
        contact_info: row.contact_info ?? row.contact_person,
        phone_number: row.phone_number,
        candidate_response_note: row.candidate_response_note,
        candidate_proposed_date: null,
        candidate_proposed_start_time: null,
        candidate_proposed_duration_minutes: null,
        candidate_proposed_timezone: null,
        created_at: toDate(row.created_at),
        updated_at: toDate(row.updated_at)
      };
    });

    const offerRows = offers.map((row) => {
      const company = companyById.get(legacyId(row.company_id));

      return {
        id: legacyId(row.id),
        application_id: legacyId(row.application_id),
        job_id: legacyId(row.job_id),
        candidate_identity_id: legacyId(row.candidate_user_id),
        employer_identity_id: legacyId(company?.user_id),
        title: row.title,
        seniority_label: row.seniority_label,
        department_team: null,
        reporting_to: null,
        message: row.message,
        bonus_details: row.bonus_details,
        contract_document_url: row.contract_document_url,
        salary: row.salary !== null && row.salary !== undefined ? String(row.salary) : null,
        salary_period: null,
        currency: row.currency,
        employment_type: row.employment_type,
        work_model: row.work_model,
        start_date: formatDateOnly(row.start_date),
        location: row.location,
        probation_type: null,
        probation_custom: null,
        status: row.status,
        expires_at: toDate(row.expires_at),
        sent_at: toDate(row.sent_at),
        viewed_at: toDate(row.viewed_at),
        responded_at: toDate(row.responded_at),
        created_by_identity_id: legacyId(row.created_by_user_id),
        created_at: toDate(row.created_at),
        updated_at: toDate(row.updated_at),
        deleted_at: null
      };
    });

    const offerBenefitRows = offers
      .filter((row) => toNullableText(row.benefits))
      .map((row) => ({
        id: `legacy-benefit-${row.id}`.slice(0, 64),
        offer_id: legacyId(row.id),
        catalog_id: null,
        type: 'legacy_text',
        name: 'Migrated benefits',
        description: row.benefits,
        has_monetary_value: false,
        amount: null,
        currency: row.currency,
        frequency: null,
        annual_leave_days: null,
        metadata: null,
        created_at: toDate(row.created_at),
        updated_at: toDate(row.updated_at)
      }));

    const recruiterNoteRows = recruiterNotes.map((row) => ({
      id: legacyId(row.id),
      application_id: legacyId(row.application_id),
      author_identity_id: legacyId(row.author_user_id),
      body: row.body,
      created_at: toDate(row.created_at),
      updated_at: toDate(row.created_at)
    }));

    await upsertRows(target, 'applications', ['id'], applicationRows, context);
    await upsertRows(
      target,
      'application_histories',
      ['id'],
      historyRows,
      context
    );
    await upsertRows(target, 'interviews', ['id'], interviewRows, context);
    await upsertRows(target, 'job_offers', ['id'], offerRows, context);
    await upsertRows(target, 'offer_benefits', ['id'], offerBenefitRows, context);
    await upsertRows(
      target,
      'recruiter_notes',
      ['id'],
      recruiterNoteRows,
      context
    );
    context.log('skip benefit_catalogs: no equivalent source table in monolith schema');
  } finally {
    source.release();
    target.release();
  }
}

async function migrateCommunication(sourcePool, targetPool, context) {
  const source = await sourcePool.connect();
  const target = await targetPool.connect();

  try {
    const notifications = await loadOptionalTable(source, 'notifications');

    const notificationRows = notifications.map((row) => ({
      id: legacyId(row.id),
      identity_id: legacyId(row.user_id),
      type: row.type ?? 'generic',
      title: row.title ?? '',
      message: row.message ?? '',
      metadata_json: toJsonString(row.metadata),
      source_event_id: null,
      read_at: null,
      created_at: toDate(row.created_at)
    }));

    await upsertRows(target, 'notifications', ['id'], notificationRows, context);
    context.log(
      'skip recruitment_mail_deliveries: no equivalent durable source table in monolith schema'
    );
  } finally {
    source.release();
    target.release();
  }
}

function createPool(connectionString) {
  return new Pool({
    connectionString,
    max: 4
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFile(options.envFile);
  const context = createContext(options);
  const monolithPool = createPool(requireEnv('MONOLITH_DATABASE_URL'));

  const targetPools = {
    iam: createPool(process.env.IAM_DIRECT_URL || requireEnv('IAM_DATABASE_URL')),
    employer: createPool(
      process.env.EMPLOYER_DIRECT_URL || requireEnv('EMPLOYER_DATABASE_URL')
    ),
    candidate: createPool(
      process.env.CANDIDATE_DIRECT_URL || requireEnv('CANDIDATE_DATABASE_URL')
    ),
    job: createPool(process.env.JOB_DIRECT_URL || requireEnv('JOB_DATABASE_URL')),
    application: createPool(
      process.env.APPLICATION_DIRECT_URL ||
        requireEnv('APPLICATION_DATABASE_URL')
    ),
    communication: createPool(
      process.env.COMMUNICATION_DIRECT_URL ||
        requireEnv('COMMUNICATION_DATABASE_URL')
    )
  };

  const runners = {
    iam: migrateIam,
    employer: migrateEmployer,
    candidate: migrateCandidate,
    job: migrateJob,
    application: migrateApplication,
    communication: migrateCommunication
  };

  try {
    for (const domain of DOMAIN_ORDER) {
      if (!options.domains.includes(domain)) {
        continue;
      }

      const runner = runners[domain];
      if (!runner) {
        throw new Error(`Unsupported domain: ${domain}`);
      }

      context.log(`\n=== migrate ${domain} ===`);
      await runner(monolithPool, targetPools[domain], context);
    }

    context.log('\nMigration completed.');
  } finally {
    await Promise.allSettled([
      monolithPool.end(),
      ...Object.values(targetPools).map((pool) => pool.end())
    ]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
