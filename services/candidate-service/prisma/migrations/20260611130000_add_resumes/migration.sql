CREATE TABLE "resume_templates" (
    "id" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnail" TEXT,
    "category" TEXT,
    "layout_data" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resumes" (
    "id" VARCHAR(64) NOT NULL,
    "identity_id" VARCHAR(64) NOT NULL,
    "template_id" VARCHAR(64),
    "title" TEXT NOT NULL,
    "is_using" BOOLEAN NOT NULL DEFAULT false,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resumes_identity_id_idx" ON "resumes"("identity_id");

CREATE INDEX "resumes_identity_id_template_id_idx" ON "resumes"("identity_id", "template_id");

ALTER TABLE "resumes" ADD CONSTRAINT "resumes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "resume_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "resume_templates" ("id", "name", "thumbnail", "category", "layout_data", "is_active", "created_at")
VALUES (
    'resume-template-classic-1',
    'Classic Professional',
    NULL,
    'professional',
    '{"version":1,"sections":["header","summary","experience","education","skills"]}'::jsonb,
    true,
    CURRENT_TIMESTAMP
);
