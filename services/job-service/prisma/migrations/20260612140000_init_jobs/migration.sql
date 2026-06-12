CREATE TABLE "jobs" (
    "id" VARCHAR(64) NOT NULL,
    "employer_identity_id" VARCHAR(64) NOT NULL,
    "company_id" VARCHAR(64) NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_logo_url" TEXT,
    "company_industry" TEXT,
    "company_website" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "responsibilities_json" TEXT,
    "requirements_json" TEXT,
    "benefits_json" TEXT,
    "employment_type" TEXT,
    "level" TEXT,
    "category" TEXT,
    "city" TEXT,
    "country" TEXT,
    "is_remote" BOOLEAN NOT NULL DEFAULT false,
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "currency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");
CREATE INDEX "jobs_employer_identity_id_idx" ON "jobs"("employer_identity_id");
CREATE INDEX "jobs_company_id_idx" ON "jobs"("company_id");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
