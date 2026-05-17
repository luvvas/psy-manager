CREATE TABLE "video_session" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text,
	"psychologist_id" text NOT NULL,
	"patient_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ended_at" timestamp,
	CONSTRAINT "video_session_patient_token_unique" UNIQUE("patient_token")
);
--> statement-breakpoint
ALTER TABLE "video_session" ADD CONSTRAINT "video_session_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_session" ADD CONSTRAINT "video_session_psychologist_id_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;