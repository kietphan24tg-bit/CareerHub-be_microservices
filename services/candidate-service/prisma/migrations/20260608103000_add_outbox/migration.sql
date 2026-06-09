CREATE TABLE "outbox" (
    "id" VARCHAR(64) NOT NULL,
    "event_name" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_status_occurred_at_idx" ON "outbox"("status", "occurred_at");
