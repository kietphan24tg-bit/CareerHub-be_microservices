ALTER TABLE "outbox"
ADD COLUMN "last_error" TEXT,
ADD COLUMN "next_retry_at" TIMESTAMP(3),
ADD COLUMN "processing_at" TIMESTAMP(3);

CREATE INDEX "outbox_status_next_retry_at_idx" ON "outbox"("status", "next_retry_at");
