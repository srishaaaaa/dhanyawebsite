-- Phase 5–6: checkout, payments, coupons, invoices, accounts, homepage drafts
CREATE SEQUENCE IF NOT EXISTS "order_seq" START 1001;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "invoice_seq" START 1;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "access_token" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reserved_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_method" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_issued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "return_reason" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_email_idx" ON "orders" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_pending_idx" ON "orders" USING btree ("reserved_until") WHERE "orders"."status" = 'pending_payment';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'processed' NOT NULL;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN IF NOT EXISTS "actor_id" text REFERENCES "users"("id") ON DELETE set null;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "coupons" ADD CONSTRAINT "coupon_usage_within_limit" CHECK ("usage_limit" IS NULL OR "used_count" <= "usage_limit");
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "max_discount" numeric(12, 2);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL REFERENCES "coupons"("id") ON DELETE restrict,
	"order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE cascade,
	"user_id" text REFERENCES "users"("id") ON DELETE set null,
	"email" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_order_uq" ON "coupon_redemptions" USING btree ("coupon_id","order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_redemptions_email_idx" ON "coupon_redemptions" USING btree ("coupon_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_order_item_uq" ON "reviews" USING btree ("order_item_id") WHERE "reviews"."order_item_id" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_product_idx" ON "reviews" USING btree ("product_id","status");--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'announcement' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "navigation_menus_location_uq" ON "navigation_menus" USING btree ("location");--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "unsubscribed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "hsn_code" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "product_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "taxable_value" numeric(12, 2) DEFAULT '0' NOT NULL;
