ALTER TABLE "candidate_profiles" ADD COLUMN "resume_id" VARCHAR(64);

CREATE INDEX "candidate_profiles_resume_id_idx" ON "candidate_profiles"("resume_id");
