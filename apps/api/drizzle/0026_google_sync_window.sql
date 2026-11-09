ALTER TABLE "user" ADD COLUMN "google_sync_days_back" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "google_sync_days_ahead" integer DEFAULT 90 NOT NULL;