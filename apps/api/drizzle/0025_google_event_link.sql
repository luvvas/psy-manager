CREATE TABLE "google_event_link" (
	"id" text PRIMARY KEY NOT NULL,
	"psychologist_id" text NOT NULL,
	"google_key" text NOT NULL,
	"patient_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_event_link" ADD CONSTRAINT "google_event_link_psychologist_id_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_event_link" ADD CONSTRAINT "google_event_link_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "google_event_link_psychologist_key_unique" ON "google_event_link" USING btree ("psychologist_id","google_key");