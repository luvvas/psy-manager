ALTER TABLE "clinical_record" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "clinical_record" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "clinical_record" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "clinical_record" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "file_size" integer;