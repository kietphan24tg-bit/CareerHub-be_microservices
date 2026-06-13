ALTER TABLE "interviews"
ADD COLUMN "duration_minutes" INTEGER,
ADD COLUMN "interviewer_name" VARCHAR(255),
ADD COLUMN "interviewer_role" VARCHAR(255),
ADD COLUMN "interviewers" JSONB,
ADD COLUMN "logistics_note" TEXT,
ADD COLUMN "location_lat" VARCHAR(64),
ADD COLUMN "location_lng" VARCHAR(64),
ADD COLUMN "candidate_proposed_date" VARCHAR(32),
ADD COLUMN "candidate_proposed_start_time" VARCHAR(32),
ADD COLUMN "candidate_proposed_duration_minutes" INTEGER,
ADD COLUMN "candidate_proposed_timezone" VARCHAR(64);

CREATE INDEX "interviews_employer_identity_id_idx" ON "interviews"("employer_identity_id");

ALTER TABLE "job_offers"
ADD COLUMN "department_team" VARCHAR(255),
ADD COLUMN "reporting_to" VARCHAR(255),
ADD COLUMN "salary_period" VARCHAR(64),
ADD COLUMN "probation_type" VARCHAR(64),
ADD COLUMN "probation_custom" VARCHAR(255);

CREATE INDEX "job_offers_employer_identity_id_idx" ON "job_offers"("employer_identity_id");

CREATE TABLE "offer_benefits" (
    "id" VARCHAR(64) NOT NULL,
    "offer_id" VARCHAR(64) NOT NULL,
    "catalog_id" VARCHAR(64),
    "type" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255),
    "description" TEXT,
    "has_monetary_value" BOOLEAN NOT NULL DEFAULT false,
    "amount" VARCHAR(64),
    "currency" VARCHAR(32),
    "frequency" VARCHAR(64),
    "annual_leave_days" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_benefits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offer_benefits_offer_id_idx" ON "offer_benefits"("offer_id");

ALTER TABLE "offer_benefits"
ADD CONSTRAINT "offer_benefits_offer_id_fkey"
FOREIGN KEY ("offer_id") REFERENCES "job_offers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "benefit_catalogs" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "has_monetary_value_default" BOOLEAN NOT NULL DEFAULT false,
    "requires_amount" BOOLEAN NOT NULL DEFAULT false,
    "requires_frequency" BOOLEAN NOT NULL DEFAULT false,
    "requires_annual_leave_days" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_selectable" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_catalogs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "benefit_catalogs_code_key" ON "benefit_catalogs"("code");
CREATE INDEX "benefit_catalogs_is_active_idx" ON "benefit_catalogs"("is_active");
CREATE INDEX "benefit_catalogs_is_selectable_idx" ON "benefit_catalogs"("is_selectable");
CREATE INDEX "benefit_catalogs_sort_order_idx" ON "benefit_catalogs"("sort_order");
