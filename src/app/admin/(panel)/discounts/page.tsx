import { asc, desc, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, products, collections } from "@/db/schema";
import { requireSection, hasRole } from "@/lib/authz";
import { PageHeader } from "@/components/admin/ui";
import CouponManager from "@/components/admin/CouponManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discounts" };

const toIst = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

export default async function Discounts() {
  const me = await requireSection("discounts");
  const [rows, prods, cols] = await Promise.all([
    db.select({ c: coupons, redeemed: sql<string>`(select coalesce(sum(amount),0) from coupon_redemptions r where r.coupon_id = ${coupons.id})` }).from(coupons).orderBy(desc(coupons.createdAt)),
    db.select({ id: products.id, label: products.name }).from(products).where(ne(products.status, "archived")).orderBy(asc(products.name)),
    db.select({ id: collections.id, label: collections.title }).from(collections).orderBy(asc(collections.title)),
  ]);
  return (
    <div>
      <PageHeader title="Discounts and coupons" description="Codes are validated on the server at checkout — dates, limits, minimum spend and eligible products are all enforced there." />
      <CouponManager canDelete={hasRole(me.role, "admin")} products={prods} collections={cols}
        rows={rows.map(({ c, redeemed }) => ({
          id: c.id, code: c.code, description: c.description ?? "", type: c.type, value: String(Number(c.value)), minOrderValue: c.minOrderValue ? String(Number(c.minOrderValue)) : "",
          maxDiscount: c.maxDiscount ? String(Number(c.maxDiscount)) : "", usageLimit: c.usageLimit ? String(c.usageLimit) : "", perCustomerLimit: c.perCustomerLimit ? String(c.perCustomerLimit) : "",
          productIds: c.productIds ?? [], collectionIds: c.collectionIds ?? [], startsAt: toIst(c.startsAt), expiresAt: toIst(c.expiresAt), isActive: c.isActive,
          usedCount: c.usedCount, redeemed: Number(redeemed), expired: Boolean(c.expiresAt && c.expiresAt < new Date()),
        }))} />
    </div>
  );
}
