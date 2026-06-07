ALTER TABLE "candidate_profiles"
ADD COLUMN "avatar_url" TEXT,
ADD COLUMN "headline" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "github_url" TEXT,
ADD COLUMN "linkedin_url" TEXT,
ADD COLUMN "portfolio_url" TEXT,
ADD COLUMN "years_experience" INTEGER;

ALTER TABLE "candidate_profiles"
ALTER COLUMN "phone" DROP NOT NULL;
