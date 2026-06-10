ALTER TABLE "password_reset_tokens"
ADD COLUMN "mail_processing_at" TIMESTAMP(3),
ADD COLUMN "mail_sent_at" TIMESTAMP(3);

CREATE INDEX "password_reset_tokens_mail_sent_at_mail_processing_at_idx"
ON "password_reset_tokens"("mail_sent_at", "mail_processing_at");
