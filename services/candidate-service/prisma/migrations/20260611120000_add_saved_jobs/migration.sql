CREATE TABLE "saved_jobs" (
    "id" VARCHAR(64) NOT NULL,
    "identity_id" VARCHAR(64) NOT NULL,
    "job_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_jobs_identity_id_job_id_key" ON "saved_jobs"("identity_id", "job_id");

CREATE INDEX "saved_jobs_identity_id_created_at_idx" ON "saved_jobs"("identity_id", "created_at");
