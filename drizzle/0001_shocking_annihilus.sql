ALTER TABLE "pools" ADD COLUMN "purpose" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pools" ADD COLUMN "beneficiary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pools" ADD COLUMN "payment_provider" text;--> statement-breakpoint
ALTER TABLE "pools" ADD COLUMN "payment_account" text;--> statement-breakpoint
ALTER TABLE "pools" ADD COLUMN "payment_instructions" text DEFAULT '' NOT NULL;