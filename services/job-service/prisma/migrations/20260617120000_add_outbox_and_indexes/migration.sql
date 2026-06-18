CREATE TABLE "outbox" (
    "id" VARCHAR(64) NOT NULL,
    "event_name" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_retry_at" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "processing_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jobs_status_created_at_idx" ON "jobs"("status", "created_at");
CREATE INDEX "jobs_status_slug_idx" ON "jobs"("status", "slug");

CREATE INDEX "outbox_status_occurred_at_idx" ON "outbox"("status", "occurred_at");
CREATE INDEX "outbox_status_next_retry_at_idx" ON "outbox"("status", "next_retry_at");
