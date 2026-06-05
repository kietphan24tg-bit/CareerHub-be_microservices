CREATE TABLE "candidate_profiles" (
    "id" VARCHAR(64) NOT NULL,
    "identity_id" VARCHAR(64) NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidate_profiles_identity_id_key" ON "candidate_profiles"("identity_id");
