-- Phase 7: staff MFA, back-in-stock alerts
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_last_step" integer;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL REFERENCES "product_variants"("id") ON DELETE cascade,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_alerts_variant_email_uq" ON "stock_alerts" USING btree ("variant_id", lower("email")) WHERE "stock_alerts"."notified_at" is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_pending_idx" ON "stock_alerts" USING btree ("variant_id") WHERE "stock_alerts"."notified_at" is null;
