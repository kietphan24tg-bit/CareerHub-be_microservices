-- CreateEnum
CREATE TYPE "IdentityRole" AS ENUM ('candidate', 'employer');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('active', 'disabled');

-- CreateTable
CREATE TABLE "identities" (
    "id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "IdentityRole" NOT NULL,
    "status" "IdentityStatus" NOT NULL,
    "accepted_terms" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identities_email_key" ON "identities"("email");
