-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" VARCHAR(64) NOT NULL,
    "identity_id" VARCHAR(64) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "remember_me" BOOLEAN NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_identity_id_idx" ON "auth_sessions"("identity_id");
