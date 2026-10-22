-- Phase 3–4: catalog + storefront support
ALTER TABLE "contact_messages" ADD COLUMN IF NOT EXISTS "ip" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "carts_session_uq" ON "carts" USING btree ("session_id") WHERE "carts"."session_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_user_product_uq" ON "wishlist_items" USING btree ("user_id","product_id") WHERE "wishlist_items"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_session_product_uq" ON "wishlist_items" USING btree ("session_id","product_id") WHERE "wishlist_items"."session_id" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_mov_created_idx" ON "inventory_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_publish_idx" ON "products" USING btree ("status","publish_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_collections_collection_idx" ON "product_collections" USING btree ("collection_id");
