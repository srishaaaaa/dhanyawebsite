import {
  pgTable, pgEnum, uuid, text, integer, numeric, boolean, timestamp, jsonb,
  primaryKey, index, uniqueIndex, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const money = (name: string) => numeric(name, { precision: 12, scale: 2 });

/* ---------- Enums ---------- */
export const roleEnum = pgEnum("role", ["owner", "admin", "staff", "customer"]);
export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);
export const orderStatus = pgEnum("order_status", [
  "pending_payment", "confirmed", "processing", "packed", "shipped",
  "out_for_delivery", "delivered", "cancelled", "return_requested", "returned", "refunded",
]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed", "refunded", "partially_refunded"]);
export const paymentMethod = pgEnum("payment_method", ["razorpay", "cod"]);
export const couponType = pgEnum("coupon_type", ["percentage", "fixed"]);
export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const contentStatus = pgEnum("content_status", ["draft", "published"]);

/* ---------- Auth.js (Drizzle adapter) + customers ---------- */
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  mfaSecret: text("mfa_secret"),                       // base32 TOTP secret (staff two-step sign-in)
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaLastStep: integer("mfa_last_step"),               // last accepted TOTP time-step (blocks code replay)
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);

// Roles live ONLY here, server-checked. Registration never inserts admin/staff.
export const userRoles = pgTable("user_roles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull().default("customer"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  createdAt: createdAt(),
});

export const addresses = pgTable("addresses", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("addresses_user_idx").on(t.userId), check("pincode_6", sql`${t.pincode} ~ '^[1-9][0-9]{5}$'`)]);

/* ---------- Catalog ---------- */
export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  parentId: uuid("parent_id"),
  isOccasion: boolean("is_occasion").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const collections = pgTable("collections", {
  id: id(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  ctaLabel: text("cta_label"),
  ctaHref: text("cta_href"),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = pgTable("products", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  designer: text("designer"),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  productType: text("product_type"),
  price: money("price").notNull(),               // GST-exclusive selling price
  compareAtPrice: money("compare_at_price"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("0"), // per product, configurable
  hsnCode: text("hsn_code"),
  material: text("material"),
  careInstructions: text("care_instructions"),
  fitInfo: text("fit_info"),
  sizeGuide: text("size_guide"),
  weightGrams: integer("weight_grams"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  videoUrl: text("video_url"),
  model3dUrl: text("model_3d_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  isNewArrival: boolean("is_new_arrival").notNull().default(false),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
  status: productStatus("status").notNull().default("draft"),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  relatedProductIds: uuid("related_product_ids").array().notNull().default(sql`'{}'::uuid[]`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("products_status_idx").on(t.status),
  index("products_category_idx").on(t.categoryId),
  index("products_publish_idx").on(t.status, t.publishAt),
  check("price_nonneg", sql`${t.price} >= 0`),
]);

export const productCollections = pgTable("product_collections", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.productId, t.collectionId] }), index("product_collections_collection_idx").on(t.collectionId)]);

export const productImages = pgTable("product_images", {
  id: id(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").notNull().default(0),
  colorName: text("color_name"),
}, (t) => [index("product_images_product_idx").on(t.productId)]);

export const productVariants = pgTable("product_variants", {
  id: id(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  sku: text("sku").notNull().unique(),
  size: text("size"),
  color: text("color"),
  colorHex: text("color_hex"),
  priceOverride: money("price_override"),
  stock: integer("stock").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("variants_product_idx").on(t.productId),
  uniqueIndex("variants_unique_combo").on(t.productId, t.size, t.color),
  check("stock_nonneg", sql`${t.stock} >= 0`),
  check("reserved_valid", sql`${t.reserved} >= 0 AND ${t.reserved} <= ${t.stock}`), // DB-level oversell guard
]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: id(),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),   // sale | restock | correction | return | reservation | release
  note: text("note"),
  orderId: uuid("order_id"),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [index("inv_mov_variant_idx").on(t.variantId), index("inv_mov_created_idx").on(t.createdAt)]);

/* ---------- Cart & wishlist ---------- */
export const carts = pgTable("carts", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("carts_user_idx").on(t.userId),
  index("carts_session_idx").on(t.sessionId),
  uniqueIndex("carts_session_uq").on(t.sessionId).where(sql`${t.sessionId} is not null`),
]);

export const cartItems = pgTable("cart_items", {
  id: id(),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
}, (t) => [uniqueIndex("cart_item_unique").on(t.cartId, t.variantId), check("qty_pos", sql`${t.quantity} > 0`)]);

export const wishlistItems = pgTable("wishlist_items", {
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [
  index("wishlist_user_idx").on(t.userId),
  index("wishlist_session_idx").on(t.sessionId),
  uniqueIndex("wishlist_user_product_uq").on(t.userId, t.productId).where(sql`${t.userId} is not null`),
  uniqueIndex("wishlist_session_product_uq").on(t.sessionId, t.productId).where(sql`${t.sessionId} is not null`),
]);

/* ---------- Coupons ---------- */
export const coupons = pgTable("coupons", {
  id: id(),
  code: text("code").notNull().unique(),
  type: couponType("type").notNull(),
  value: money("value").notNull(),
  minOrderValue: money("min_order_value"),
  productIds: uuid("product_ids").array(),
  collectionIds: uuid("collection_ids").array(),
  usageLimit: integer("usage_limit"),
  perCustomerLimit: integer("per_customer_limit"),
  usedCount: integer("used_count").notNull().default(0),
  description: text("description"),
  maxDiscount: money("max_discount"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [check("coupon_usage_within_limit", sql`${t.usageLimit} IS NULL OR ${t.usedCount} <= ${t.usageLimit}`)]);

/* ---------- Orders & payments ---------- */
export const orders = pgTable("orders", {
  id: id(),
  orderNumber: text("order_number").notNull().unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  status: orderStatus("status").notNull().default("pending_payment"),
  paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
  paymentMethod: paymentMethod("payment_method").notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  billingAddress: jsonb("billing_address").notNull(),
  subtotal: money("subtotal").notNull(),
  discountTotal: money("discount_total").notNull().default("0"),
  shippingTotal: money("shipping_total").notNull().default("0"),
  shippingTax: money("shipping_tax").notNull().default("0"),  // only when GST-on-delivery chosen per bill
  cgstTotal: money("cgst_total").notNull().default("0"),
  sgstTotal: money("sgst_total").notNull().default("0"),
  igstTotal: money("igst_total").notNull().default("0"),
  grandTotal: money("grand_total").notNull(),
  couponCode: text("coupon_code"),
  idempotencyKey: text("idempotency_key").unique(),           // prevents duplicate orders
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  invoiceNumber: text("invoice_number").unique(),
  internalNotes: text("internal_notes"),
  accessToken: text("access_token"),            // lets guests open their own order page
  reservedUntil: timestamp("reserved_until", { withTimezone: true }), // unpaid online orders release stock after this
  shippingMethod: text("shipping_method"),
  customerNote: text("customer_note"),
  invoiceIssuedAt: timestamp("invoice_issued_at", { withTimezone: true }),
  returnReason: text("return_reason"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("orders_user_idx").on(t.userId), index("orders_status_idx").on(t.status),
  index("orders_created_idx").on(t.createdAt), index("orders_email_idx").on(t.email),
]);

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: id(),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  amount: money("amount").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("coupon_redemptions_order_uq").on(t.couponId, t.orderId), index("coupon_redemptions_email_idx").on(t.couponId, t.email)]);

// Price/tax snapshots: history survives product edits/archival.
export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productId: uuid("product_id"),                 // snapshot link for reviews/reports (no FK: products may be deleted)
  productName: text("product_name").notNull(),
  sku: text("sku").notNull(),
  size: text("size"),
  color: text("color"),
  imageUrl: text("image_url"),
  unitPrice: money("unit_price").notNull(),       // GST-inclusive unit price at time of order
  quantity: integer("quantity").notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
  cgst: money("cgst").notNull().default("0"),
  sgst: money("sgst").notNull().default("0"),
  igst: money("igst").notNull().default("0"),
  hsnCode: text("hsn_code"),
  discount: money("discount").notNull().default("0"),          // GST-inclusive coupon share
  taxableValue: money("taxable_value").notNull().default("0"), // after discount, before GST
  lineTotal: money("line_total").notNull(),                    // GST-inclusive, after discount
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const orderStatusHistory = pgTable("order_status_history", {
  id: id(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatus("from_status"),
  toStatus: orderStatus("to_status").notNull(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: createdAt(),
});

export const payments = pgTable("payments", {
  id: id(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  provider: text("provider").notNull().default("razorpay"),
  providerOrderId: text("provider_order_id").unique(),
  providerPaymentId: text("provider_payment_id").unique(),
  amount: money("amount").notNull(),
  status: paymentStatus("status").notNull().default("pending"),
  method: text("method"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Webhook idempotency: insert event id first; unique violation = already processed.
export const webhookEvents = pgTable("webhook_events", {
  eventId: text("event_id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: id(),
  paymentId: uuid("payment_id").notNull().references(() => payments.id, { onDelete: "restrict" }),
  providerRefundId: text("provider_refund_id").unique(),
  amount: money("amount").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("processed"),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ---------- Reviews, content, settings ---------- */
export const reviews = pgTable("reviews", {
  id: id(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  orderItemId: uuid("order_item_id"),   // verified purchase link
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  photoUrls: text("photo_urls").array().notNull().default(sql`'{}'::text[]`),
  isFeatured: boolean("is_featured").notNull().default(false),
  status: reviewStatus("status").notNull().default("pending"),
  createdAt: createdAt(),
}, (t) => [
  check("rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  uniqueIndex("reviews_order_item_uq").on(t.orderItemId).where(sql`${t.orderItemId} is not null`),
  index("reviews_product_idx").on(t.productId, t.status),
]);

export const homepageSections = pgTable("homepage_sections", {
  id: id(),
  type: text("type").notNull(),       // hero | collections | new_arrivals | campaign | story | occasions | favorites | testimonials | newsletter
  content: jsonb("content").notNull().default({}),        // published content (the working draft lives in store_settings.homepage_draft)
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  status: contentStatus("status").notNull().default("draft"),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  unpublishAt: timestamp("unpublish_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const campaigns = pgTable("campaigns", {
  id: id(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("announcement"),   // announcement | banner
  content: jsonb("content").notNull().default({}),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  status: contentStatus("status").notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const pages = pgTable("pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  status: contentStatus("status").notNull().default("draft"),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const navigationMenus = pgTable("navigation_menus", {
  id: id(),
  location: text("location").notNull(),   // header | footer
  items: jsonb("items").notNull().default([]),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("navigation_menus_location_uq").on(t.location)]);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: id(),
  email: text("email").notNull().unique(),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  ip: text("ip"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: createdAt(),
});

// Non-secret settings only (secrets stay in env vars).
export const storeSettings = pgTable("store_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  ip: text("ip"),
  createdAt: createdAt(),
}, (t) => [index("audit_created_idx").on(t.createdAt)]);

// "Email me when it's back" requests for sold-out variants.
export const stockAlerts = pgTable("stock_alerts", {
  id: id(),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  createdAt: createdAt(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("stock_alerts_variant_email_uq").on(t.variantId, sql`lower(${t.email})`).where(sql`${t.notifiedAt} is null`),
  index("stock_alerts_pending_idx").on(t.variantId).where(sql`${t.notifiedAt} is null`),
]);
