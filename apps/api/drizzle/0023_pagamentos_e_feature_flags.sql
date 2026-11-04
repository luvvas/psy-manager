CREATE TABLE "charge" (
	"id" text PRIMARY KEY NOT NULL,
	"psychologist_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"appointment_id" text,
	"session_date" timestamp NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"paid_at" timestamp,
	"payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flag" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percent" integer DEFAULT 0 NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flag_override" (
	"id" text PRIMARY KEY NOT NULL,
	"flag_key" text NOT NULL,
	"psychologist_id" text NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"psychologist_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_at" timestamp NOT NULL,
	"method" text NOT NULL,
	"financial_transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pix_key" text;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_psychologist_id_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_override" ADD CONSTRAINT "feature_flag_override_flag_key_feature_flag_key_fk" FOREIGN KEY ("flag_key") REFERENCES "public"."feature_flag"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_override" ADD CONSTRAINT "feature_flag_override_psychologist_id_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_psychologist_id_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_financial_transaction_id_financial_transaction_id_fk" FOREIGN KEY ("financial_transaction_id") REFERENCES "public"."financial_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "charge_appointment_unique" ON "charge" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_charge_psychologist_status" ON "charge" USING btree ("psychologist_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flag_override_flag_psychologist_unique" ON "feature_flag_override" USING btree ("flag_key","psychologist_id");--> statement-breakpoint
CREATE INDEX "idx_payment_psychologist_patient" ON "payment" USING btree ("psychologist_id","patient_id");--> statement-breakpoint
INSERT INTO "feature_flag" ("key", "enabled", "rollout_percent", "description") VALUES ('pagamentos', false, 0, 'Contas a receber por paciente (aba A receber no Financeiro e aba Financeiro do paciente)') ON CONFLICT ("key") DO NOTHING;
