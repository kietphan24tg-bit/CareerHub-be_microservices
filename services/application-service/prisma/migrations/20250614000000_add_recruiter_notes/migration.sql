-- CreateTable
CREATE TABLE "recruiter_notes" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "author_identity_id" VARCHAR(64) NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiter_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recruiter_notes_application_id_idx" ON "recruiter_notes"("application_id");

-- CreateIndex
CREATE INDEX "recruiter_notes_author_identity_id_idx" ON "recruiter_notes"("author_identity_id");

-- AddForeignKey
ALTER TABLE "recruiter_notes" ADD CONSTRAINT "recruiter_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
