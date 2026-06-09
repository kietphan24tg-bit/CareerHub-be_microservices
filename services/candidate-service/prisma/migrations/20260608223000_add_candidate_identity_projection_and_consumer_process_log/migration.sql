CREATE TABLE "candidate_identity_projections" (
    "identity_id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "accepted_terms" BOOLEAN NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_identity_projections_pkey" PRIMARY KEY ("identity_id")
);

CREATE TABLE "integration_consumer_process_logs" (
    "id" VARCHAR(255) NOT NULL,
    "consumer_name" VARCHAR(128) NOT NULL,
    "event_name" VARCHAR(255) NOT NULL,
    "message_id" VARCHAR(191) NOT NULL,
    "request_id" VARCHAR(191),
    "processed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_consumer_process_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_consumer_process_logs_consumer_name_message_id_key"
ON "integration_consumer_process_logs"("consumer_name", "message_id");

CREATE INDEX "integration_consumer_process_logs_event_name_processed_at_idx"
ON "integration_consumer_process_logs"("event_name", "processed_at");
