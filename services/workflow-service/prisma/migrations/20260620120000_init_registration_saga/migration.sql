CREATE TABLE "registration_sagas" (
    "id" VARCHAR(64) NOT NULL,
    "flow" VARCHAR(64) NOT NULL,
    "request_id" VARCHAR(128),
    "status" VARCHAR(64) NOT NULL,
    "last_step" VARCHAR(64),
    "email" TEXT NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "identity_id" VARCHAR(64),
    "profile_id" VARCHAR(64),
    "profile_payload_json" TEXT,
    "failure_code" VARCHAR(128),
    "failure_message" TEXT,
    "completed_at" TIMESTAMP(3),
    "compensated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "registration_sagas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registration_saga_steps" (
    "id" VARCHAR(64) NOT NULL,
    "saga_id" VARCHAR(64) NOT NULL,
    "step_name" VARCHAR(64) NOT NULL,
    "status" VARCHAR(64) NOT NULL,
    "compensation_status" VARCHAR(64) NOT NULL DEFAULT 'NOT_REQUIRED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "result_snapshot_json" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "compensated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "registration_saga_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registration_sagas_request_id_key"
ON "registration_sagas"("request_id");

CREATE UNIQUE INDEX "registration_sagas_identity_id_key"
ON "registration_sagas"("identity_id");

CREATE INDEX "registration_sagas_flow_status_idx"
ON "registration_sagas"("flow", "status");

CREATE UNIQUE INDEX "registration_saga_steps_saga_id_step_name_key"
ON "registration_saga_steps"("saga_id", "step_name");

CREATE INDEX "registration_saga_steps_saga_id_status_idx"
ON "registration_saga_steps"("saga_id", "status");

CREATE INDEX "registration_saga_steps_saga_id_compensation_status_idx"
ON "registration_saga_steps"("saga_id", "compensation_status");

ALTER TABLE "registration_saga_steps"
ADD CONSTRAINT "registration_saga_steps_saga_id_fkey"
FOREIGN KEY ("saga_id") REFERENCES "registration_sagas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
