ALTER TABLE "appointment" ADD COLUMN "reminder_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "reminder_minutes_before" integer;--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "reminder_sent_at" timestamp;