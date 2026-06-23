ALTER TABLE "jobs"
ADD COLUMN "saturday_policy" VARCHAR(32) NOT NULL DEFAULT 'unspecified',
ADD COLUMN "experience_level" VARCHAR(32) NOT NULL DEFAULT 'unspecified';

CREATE INDEX "jobs_saturday_policy_idx" ON "jobs"("saturday_policy");
CREATE INDEX "jobs_experience_level_idx" ON "jobs"("experience_level");
