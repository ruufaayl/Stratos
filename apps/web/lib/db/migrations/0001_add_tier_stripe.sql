ALTER TABLE "accounts" ADD COLUMN "tier" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "stripe_customer_id" text;