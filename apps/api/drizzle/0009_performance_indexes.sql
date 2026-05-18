-- Indexes on FK columns used as query filters (psychologist_id, patient_id, etc.)
-- PostgreSQL does not auto-create indexes for FK constraints — only for PK and UNIQUE.
-- Every protectedProcedure filters by psychologist_id, making these indexes critical.

CREATE INDEX IF NOT EXISTS "idx_patient_psychologist_id" ON "patient" ("psychologist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointment_psychologist_id" ON "appointment" ("psychologist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointment_patient_id" ON "appointment" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clinic_created_by_id" ON "clinic" ("created_by_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_psychologist_clinic_clinic_id" ON "psychologist_clinic" ("clinic_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_psychologist_clinic_psychologist_id" ON "psychologist_clinic" ("psychologist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_transaction_psychologist_id" ON "financial_transaction" ("psychologist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_transaction_patient_id" ON "financial_transaction" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_document_psychologist_id" ON "document" ("psychologist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_document_patient_id" ON "document" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_video_session_psychologist_id" ON "video_session" ("psychologist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clinical_record_psychologist_id" ON "clinical_record" ("psychologist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clinical_record_patient_id" ON "clinical_record" ("patient_id");
--> statement-breakpoint
-- Event store: index for aggregate lookups + unique constraint to guard CQRS concurrency
CREATE INDEX IF NOT EXISTS "idx_event_store_aggregate_id" ON "event_store" ("aggregate_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_store_aggregate_version_unique" ON "event_store" ("aggregate_id", "version");
