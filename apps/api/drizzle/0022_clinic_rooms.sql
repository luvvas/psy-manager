CREATE TABLE "clinic_room" (
	"id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "room_id" text;--> statement-breakpoint
ALTER TABLE "clinic_room" ADD CONSTRAINT "clinic_room_clinic_id_clinic_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_clinic_id_clinic_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_room_id_clinic_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."clinic_room"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Ocupação da sala por dia (checagem de conflito e horários livres).
CREATE INDEX IF NOT EXISTS "idx_appointment_room_date" ON "appointment" ("room_id", "date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clinic_room_clinic_id" ON "clinic_room" ("clinic_id");
