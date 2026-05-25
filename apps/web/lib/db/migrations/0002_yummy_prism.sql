ALTER TABLE "accounts" ADD COLUMN "org_id" text DEFAULT 'legacy-orphan' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "role_arn" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "region" text DEFAULT 'us-east-1' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "aws_account_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "last_scan_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_org_idx" ON "accounts" USING btree ("org_id");