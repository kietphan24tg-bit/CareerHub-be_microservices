CREATE TABLE "applications" (
    "id" VARCHAR(64) NOT NULL,
    "job_id" VARCHAR(64) NOT NULL,
    "candidate_identity_id" VARCHAR(64) NOT NULL,
    "employer_identity_id" VARCHAR(64) NOT NULL,
    "resume_id" VARCHAR(64) NOT NULL,
    "cover_letter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_histories" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "event_type" TEXT NOT NULL DEFAULT 'status_change',
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_identity_id" VARCHAR(64),
    "actor_type" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_histories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "applications_job_id_candidate_identity_id_key" ON "applications"("job_id", "candidate_identity_id");
CREATE INDEX "applications_candidate_identity_id_idx" ON "applications"("candidate_identity_id");
CREATE INDEX "applications_employer_identity_id_idx" ON "applications"("employer_identity_id");
CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");
CREATE INDEX "applications_status_idx" ON "applications"("status");

CREATE INDEX "application_histories_application_id_created_at_idx" ON "application_histories"("application_id", "created_at");

ALTER TABLE "application_histories"
ADD CONSTRAINT "application_histories_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "applications"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
