ALTER TABLE "pools" ADD COLUMN "payment_destinations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "pools"
SET "payment_destinations" = jsonb_build_array(
	jsonb_build_object('label', "payment_provider", 'value', "payment_account")
)
WHERE "payment_provider" IS NOT NULL
	AND "payment_account" IS NOT NULL
	AND "payment_destinations" = '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "pools" DROP COLUMN "payment_provider";--> statement-breakpoint
ALTER TABLE "pools" DROP COLUMN "payment_account";