CREATE TABLE "password_reset_tokens" (
    "id" VARCHAR(64) NOT NULL,
    "identity_id" VARCHAR(64) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key"
ON "password_reset_tokens"("token_hash");

CREATE INDEX "password_reset_tokens_identity_id_used_at_expires_at_idx"
ON "password_reset_tokens"("identity_id", "used_at", "expires_at");
