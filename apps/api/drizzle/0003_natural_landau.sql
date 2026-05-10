CREATE TABLE "financial_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"psychologist_id" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"date" timestamp NOT NULL,
	"category" text,
	"patient_id" text,
	"status" text DEFAULT 'paid' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient" ADD COLUMN "valor_sessao" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "patient" ADD COLUMN "modelo_cobranca" text;--> statement-breakpoint
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_psychologist_id_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE set null ON UPDATE no action;