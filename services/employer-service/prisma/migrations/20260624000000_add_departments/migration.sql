-- CreateTable
CREATE TABLE "departments" (
    "id" VARCHAR(64) NOT NULL,
    "company_id" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "departments_company_id_idx" ON "departments"("company_id");
