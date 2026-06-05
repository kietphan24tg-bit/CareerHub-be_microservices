CREATE TABLE "employer_profiles" (
    "id" VARCHAR(64) NOT NULL,
    "identity_id" VARCHAR(64) NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employer_profiles_identity_id_key" ON "employer_profiles"("identity_id");
