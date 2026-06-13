CREATE TABLE "interviews" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "job_id" VARCHAR(64) NOT NULL,
    "candidate_identity_id" VARCHAR(64) NOT NULL,
    "employer_identity_id" VARCHAR(64) NOT NULL,
    "scheduled_by_identity_id" VARCHAR(64) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'online',
    "round" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "date" VARCHAR(32),
    "start_time" VARCHAR(32),
    "end_time" VARCHAR(32),
    "timezone" VARCHAR(64),
    "notes_to_candidate" TEXT,
    "platform" VARCHAR(128),
    "meeting_link" TEXT,
    "meeting_id" VARCHAR(128),
    "passcode" VARCHAR(128),
    "office_name" VARCHAR(255),
    "full_address" TEXT,
    "location_detail" VARCHAR(255),
    "map_link" TEXT,
    "caller_info" TEXT,
    "contact_info" TEXT,
    "phone_number" VARCHAR(64),
    "candidate_response_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_offers" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "job_id" VARCHAR(64) NOT NULL,
    "candidate_identity_id" VARCHAR(64) NOT NULL,
    "employer_identity_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "seniority_label" VARCHAR(255),
    "message" TEXT,
    "bonus_details" TEXT,
    "contract_document_url" TEXT,
    "salary" VARCHAR(64),
    "currency" VARCHAR(32),
    "employment_type" VARCHAR(64),
    "work_model" VARCHAR(64),
    "start_date" VARCHAR(32),
    "location" VARCHAR(255),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "expires_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_by_identity_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_offers_application_id_key" ON "job_offers"("application_id");
CREATE INDEX "interviews_application_id_created_at_idx" ON "interviews"("application_id", "created_at");
CREATE INDEX "interviews_status_idx" ON "interviews"("status");
CREATE INDEX "job_offers_application_id_created_at_idx" ON "job_offers"("application_id", "created_at");
CREATE INDEX "job_offers_status_idx" ON "job_offers"("status");

ALTER TABLE "interviews"
ADD CONSTRAINT "interviews_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "applications"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_offers"
ADD CONSTRAINT "job_offers_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "applications"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
