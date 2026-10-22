# DHANYA BOUTIQUE — Phases 1–7 (complete)

Stack: Next.js 15 (App Router) · TypeScript · Tailwind · Neon Postgres · Drizzle ORM · Auth.js (next phase) · Cloudinary (next phase) · Razorpay (next phase)

## Setup
1. `npm install` (Phases 6–7 add `three`, `@react-three/fiber`, Vitest, Playwright and `pg`, so this also refreshes `package-lock.json` — commit it)
2. `cp .env.example .env` and fill `DATABASE_URL` (Neon pooled string), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ chars).
3. Create tables — pick ONE:
   - Run `drizzle/0000_init.sql` … `0003_staff_brand_alerts.sql` in order in the Neon SQL Editor, OR
   - `npm run db:migrate` (applies all four)
4. `npm run db:seed` — creates the first owner account, default settings, and draft policy pages.
5. Optional, development only: `npm run db:seed:demo` adds sample categories, collections and products (SKUs `DEMO-…`, tagged `demo`). Remove them with `npm run db:seed:demo -- --remove`.
6. `npm run dev` → storefront at http://localhost:3000, admin at http://localhost:3000/admin
7. Before deploying: `npm run typecheck && npm run build`.

## Notes
- Roles live only in `user_roles` (server-checked). Registration never grants admin.
- Stock oversell guard: DB check constraints on `product_variants` + atomic conditional UPDATEs (Phase 3/5).
- Neon HTTP driver has no multi-statement transactions; checkout will use the `neon-serverless` Pool for transactional order placement.
- Webhook idempotency: `webhook_events.event_id` primary key.
- GST rate is per product; delivery tax is a per-bill toggle (`orders.shipping_tax`).
- Secrets stay in env vars only.

## Roadmap (✓ = done)
✓1 Foundation · ✓2 Auth + admin shell · ✓3 Catalog/CRUD/uploads · ✓4 Storefront · ✓5 Checkout/Razorpay/invoices · ✓6 Homepage builder + 3D hero · ✓7 Staff, security, analytics, brand, tests

## Phase 2 — Admin auth
- Auth.js v5 credentials sign-in at `/admin/login` (scrypt hashing, 8h sessions).
- Rate limit: 5 failed logins per email per 15 min (counted in `admin_audit_logs`).
- Authorization: `requireStaff()` reads the role from `user_roles` in the DB on every request — JWT/client values are never trusted. Removing a role revokes access immediately.
- Staff can't open: staff, settings, payments, taxes, shipping, analytics, audit-logs, navigation.
- Middleware only redirects unauthenticated users (UX); it is not the security boundary.
- Required env: `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_TRUST_HOST=true` off Vercel.

## Phase 3 — Catalog admin
- **Products** (`/admin/products`): search, status/category filters, pagination, bulk publish/draft/archive/feature/new/bestseller, CSV export and CSV import (with a "check only" dry run).
- **Product editor** (`/admin/products/new`, `/admin/products/[id]`): basics, Markdown description, multi-image upload with progress, drag-to-reorder, alt text and colour-tagged images, size × colour variant generator, per-variant SKU / price override / stock, GST rate + HSN, fabric/fit/care, video and `.glb` 3D model, SEO with search preview, draft/active/archived + scheduled publishing, related products, duplicate, staff preview (`/preview/products/[id]`), delete (admins only; products with order history are archived instead).
- **Categories** and **Collections**: create/edit/hide/reorder; categories can be nested and flagged as occasions (powers "Shop by occasion").
- **Inventory** (`/admin/inventory`): available = stock − reserved, low/out-of-stock tabs, adjustments with reasons (restock, correction, damaged, return, count), full movement history, CSV stock-count import/export.
- **Integrity**: every stock change is one SQL statement (CTE) that updates the variant *and* writes `inventory_movements`, so they can't drift. DB check constraints block negative stock and stock below reserved. Multi-statement saves use `db.batch` (a single transaction on Neon HTTP). Removed variants are deactivated, never deleted (order history keeps its references).
- **Uploads**: signed direct-to-Cloudinary uploads (secret stays server-side). Without `CLOUDINARY_*` the editor says so and accepts pasted https image URLs instead.
- Every write is audit-logged and triggers on-demand revalidation, so the storefront updates without a redeploy.

## Phase 4 — Storefront
- **Homepage** renders from `homepage_sections` (published, visible, within schedule) and falls back to a default layout: hero, collections, new arrivals, campaign, brand story, shop by occasion, customer favourites, testimonials, newsletter. Content shapes and defaults live in `src/lib/homepage.ts` — the Phase 6 builder edits these same records.
- **Hero**: animated silk-thread canvas with champagne particles (pauses off-screen and in background tabs, fewer threads on low-end devices, static with reduced motion), arched campaign frame for image/video, once-per-session intro with skip. The WebGL/R3F scene planned for Phase 6 can replace the canvas, which then remains the fallback.
- **Shop** (`/shop`, `/collections/[slug]`, `/category/[slug]`, `/search`): server-side filtering by size, colour, price (GST-inclusive), stock; sorting by newest, popularity (paid orders), price, discount; grid/list; chips; mobile filter drawer; pagination.
- **Product page**: gallery with thumbnails, hover zoom, video, optional 3D viewer (model-viewer, loaded on demand), colour-synced images, size/colour picker with live per-variant stock, size guide, quantity, add to bag, buy now, wishlist, share, delivery estimate by PIN, accordions, approved reviews only, related and recently viewed products, Product + Breadcrumb JSON-LD.
- **Bag and wishlist**: stored in the database against an httpOnly anonymous cookie; prices and stock are always recalculated on the server. Cart drawer and `/cart` page with stock warnings and free-shipping progress.
- **Search**: debounced suggestions (name, SKU, tags, category, collection, type), recent searches on the device, ⌘/Ctrl-K.
- **Content pages**: `/about`, `/faq`, `/size-guide`, `/shipping-policy`, `/returns`, `/privacy`, `/terms` and any custom slug come from the `pages` table (Markdown). Unpublished core pages show a "being prepared" notice so footer links never 404. `/contact` has a spam-protected form (honeypot + 5/hour per IP) saved to `contact_messages`.
- Newsletter sign-up with explicit consent, SEO metadata, canonical URLs, Open Graph, `sitemap.xml`, `robots.txt`, branded 404, error and loading states, skip link, focus styles, reduced-motion support.

### Settings read by the storefront (until the Phase 7 settings screen)
`store_settings` rows (JSON): `store` → `{ name, email, phone, whatsapp, address, announcement, social: { instagram, facebook, … } }`; `shipping` → `{ flatFee, freeShippingThreshold, deliveryDays }`. Header navigation can be overridden with a `navigation_menus` row where `location = 'header'` and `items = [{ "label": "…", "href": "/…" }]`.

### Notes
- Migration `0001` was written by hand (partial unique indexes for carts/wishlists, contact IP, extra indexes). If you later run `drizzle-kit generate`, review the diff — it may re-emit these (all statements use `IF NOT EXISTS`).
- Prices are stored GST-exclusive; customers always see GST-inclusive prices ("Inclusive of all taxes").

## Phase 5 — Commerce
**Customer accounts** (`/account`): register, sign in, password reset by email (hashed one-hour tokens, throttled), profile, password change, address book, order history. Public registration always creates a `customer` role. A guest bag and wishlist merge into the account on sign-in. Guest orders are *not* linked to accounts by email (emails aren't verified, so that would leak orders); guests open orders from the secret link in their confirmation.

**Checkout** (`/checkout`): contact, delivery and billing addresses (Indian states, 6-digit PIN and mobile validation), standard/express delivery, discount codes, cash on delivery and/or Razorpay (UPI, cards, net banking, wallets). The summary is recalculated on the server on every change.

**Pricing and GST** (`src/lib/pricing.ts`, unit-tested): integer-paise maths; coupon discounts come off GST-inclusive prices and are split across eligible lines; each line's taxable value and GST are stored. Intra-state orders get CGST + SGST, inter-state orders IGST (store state set in Admin → Taxes). Optional GST on shipping. Totals always reconcile to the paisa.

**Order lifecycle** (`src/lib/orders-sql.ts`): every transition is one SQL statement, tested against Postgres:
- Placing an order inserts the order, item snapshots, stock reservations, coupon use and history in **one transaction**. Reservations can't exceed stock (DB check constraint) — two shoppers racing for the last piece can't both get it. Coupon usage limits are enforced the same way.
- Online orders hold stock for 30 minutes. Unpaid holds are released by `/api/cron/release-reservations` (daily on Vercel Hobby via `vercel.json`; use `*/15 * * * *` on Pro), and also on every checkout and when staff open Orders.
- Payment confirmation converts the reservation into a sale, assigns a sequential invoice number (`PREFIX/2026-27/00001`) and writes history — only once, however many times it's triggered.
- Cancel (releases holds or restocks), return (with optional restock), COD collected on delivery, refunds.
- Duplicate submissions return the same order (idempotency key).

**Razorpay**: orders are created server-side; the browser result is never trusted on its own — the HMAC signature is verified **and** the payment is re-fetched from Razorpay, with the amount checked. The webhook (`/api/webhooks/razorpay`; events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`) verifies its signature against the raw body and is idempotent per event id. A payment arriving after a hold expired is recorded and flagged on the order for staff. Card/UPI details never touch this app.

**Order pages**: `/order-success`, `/orders/[id]` (owner, secret link, or staff — everyone else gets a 404) with delivery progress, tracking, pay-again for unpaid online orders, customer cancellation (unpaid or COD before packing), return requests within the return window, and verified-buyer reviews. Printable GST tax invoice at `/print/invoice/[id]` (from the stored order snapshot) and packing slip at `/print/packing-slip/[id]` (staff).

**Admin**: Orders (search, filters, CSV export, timeline, status changes with allowed transitions, carrier + tracking, internal notes, Razorpay/manual refunds for admins, resend email), Customers (+ contact-form messages), Discounts (percentage/fixed, min order, max discount, product/collection restrictions, total and per-customer limits, schedule), Reviews (approve/reject/feature, verified badge), Shipping, Taxes, Payments (shows which keys are set — never their values — and the webhook URL), Store settings. The Overview is now a live dashboard with date filters (gross/net sales, orders, AOV, collected, GST, returning buyers, daily revenue, top products, categories, payment status, coupon use, recent orders, low stock). Metric definitions are printed under each figure.

**Email** (optional, Resend): order confirmation, shipping/delivery/cancellation/refund updates, password reset. Without `RESEND_API_KEY` the store works and says so where relevant.

## Phase 6 — Content
- **Homepage builder** (`/admin/homepage`): add, duplicate, remove, hide and drag-reorder sections; edit hero copy, buttons, desktop/mobile artwork, video, 3D scene, background and accent colours; pick and order featured collections and products; promo banners; campaign, story, newsletter copy; per-section schedules. Changes autosave to a **draft** (`store_settings.homepage_draft`); preview it at desktop/tablet/mobile widths (`/preview/home`, staff only); **Publish** validates every section and replaces the live layout in one transaction, then revalidates `/`. Discard returns to the live version.
- **3D hero**: React Three Fiber silk cloth (vertex-animated plane with sheen material, champagne particles, pointer parallax), loaded with `ssr: false` only on capable devices. It pauses off-screen and in background tabs, renders a single frame with reduced motion, and falls back to the 2D silk canvas without WebGL, on data-saver or very low-memory devices, or if the 3D bundle fails.
- **Campaigns** (`/admin/campaigns`): scheduled announcement-bar messages (several rotate) and banners shown under the hero and on the shop page.
- **Pages** (`/admin/pages`): Markdown editor with live preview, draft/published, scheduled publishing, SEO fields, custom landing pages at any free address. Core policy pages keep their addresses.
- **Navigation** (`/admin/navigation`): header menu and extra footer links.
- **Newsletter** (`/admin/newsletter`): subscribers, stats, unsubscribe/resubscribe, CSV export with a signed one-click unsubscribe link per subscriber (`/newsletter/unsubscribe`, two-step so mail scanners can't trigger it).

## Going live checklist
1. Set every variable in `.env.example` on Vercel (Production). Generate `AUTH_SECRET` and `CRON_SECRET` with `openssl rand -base64 32`.
2. Admin → Taxes: legal name, GSTIN, state, address, invoice prefix. Check each product's GST rate and HSN code with your accountant.
3. Admin → Shipping and Payments: fees, free-shipping threshold, COD on/off.
4. Razorpay Dashboard → Webhooks: add `https://YOUR-DOMAIN/api/webhooks/razorpay` with the events above and the webhook secret. Test with `rzp_test_` keys, then switch to live keys.
5. Publish the policy pages (Admin → Pages) and your homepage (Admin → Homepage).
6. Place a test COD order and a test online order; refund the online one from the admin.

## Phase 7 — Team, security, insight, brand, tests
- **Staff and permissions** (`/admin/staff`): add team members (a temporary password is generated and shown once), set role (owner / admin / staff) and, for staff, exactly which sections they can open. Admins manage staff; only owners manage admins and owners; the last owner can't be removed; nobody can change their own role. Every admin page, server action and export checks the section on the server (`requireSection`) — hiding a menu item is never the only protection. Removing someone takes effect on their next click.
- **Two-step sign-in** (`/admin/account`): TOTP codes from any authenticator app (RFC 6238, verified against the RFC test vectors), with replay protection (each code works once). The owner can require it for the whole team; members without it are sent to set it up before using the admin. Resetting a staff password also resets their two-step setup.
- **Reports** (`/admin/analytics`): date-filtered daily sales (orders, units, gross, discounts, shipping, GST, refunds, net), product performance (units, revenue, returns, stock now), sales by state and payment method, top customers, discount-code performance, inventory value at retail. Daily-sales and product CSV exports. Visitor traffic/conversion isn't tracked by the store — connect an analytics tool for that.
- **Brand** (Admin → Store settings → Brand): logo, favicon, the six palette colours (with live WCAG contrast checks), and headline/body fonts (Cormorant Garamond or Playfair Display; Manrope or Inter). Colours are CSS variables, so changes apply on save — no redeploy.
- **Maintenance mode** (Store settings → Maintenance): shoppers see a branded holding page and checkout is paused; signed-in staff browse normally with a reminder bar.
- **Back-in-stock alerts**: shoppers can pick a sold-out size and leave their email; when stock returns (restock, product edit, CSV import, cancellation/return, or the daily cron) each person is emailed once. Rows are claimed atomically, so nobody gets duplicates.

## Tests
| Command | What it covers | Needs |
|---|---|---|
| `npm run test` | Unit tests: pricing/GST and coupon maths, CSV, Markdown sanitising, slugs, Indian phone/PIN validation, INR formatting, TOTP RFC vectors, password hashing, financial-year invoice numbering, IST date ranges, homepage content validation | nothing |
| `npm run test:db` | Order lifecycle against real Postgres: reservations, no oversell (including two concurrent connections), payment confirmation once, invoice numbering, expiry release + coupon return, cancellation/return restock, status guards, inventory movement logging | `TEST_DATABASE_URL` (a disposable database or Neon branch; each run uses and drops its own schema) |
| `npm run test:e2e` | Playwright acceptance flows mapped to the brief's tests 1–13: product creation → storefront, homepage publish, size/colour → bag → COD checkout, order privacy, fulfilment + tracking, customer blocked from admin, unsigned webhook rejected, mobile layout, no-WebGL + reduced-motion homepage, 404 | running app, seeded DB (`db:seed` + `db:seed:demo`), `E2E_ADMIN_*` |
| `npm run test:all` | typecheck + all of the above | all of the above |

## Not included
Gift cards, loyalty points, gift packaging and abandoned-cart emails were optional in the brief and aren't built. Customer emails aren't verified at sign-up (so guest orders are deliberately not linked to accounts by email).
