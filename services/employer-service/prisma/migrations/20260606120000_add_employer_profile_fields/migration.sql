ALTER TABLE "employer_profiles"
ADD COLUMN "logo_url" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "company_size" TEXT,
ADD COLUMN "founded_year" INTEGER,
ADD COLUMN "description" TEXT,
ADD COLUMN "tax_code" TEXT;

ALTER TABLE "employer_profiles"
ALTER COLUMN "industry" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "contact_name" DROP NOT NULL,
ALTER COLUMN "contact_phone" DROP NOT NULL;
