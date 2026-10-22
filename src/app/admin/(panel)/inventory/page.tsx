import Link from "next/link";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { products, productVariants, inventoryMovements, users } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { PageHeader, Empty, Pagination, qs, btn, inputCls, Badge, Card } from "@/components/admin/ui";
import StockAdjuster from "@/components/admin/StockAdjuster";
import CsvImport from "@/components/admin/CsvImport";
import { importStockCsv } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };
const PER = 40;
type SP = { q?: string; level?: string; page?: string; variant?: string };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSection("inventory");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const avail = sql`(${productVariants.stock} - ${productVariants.reserved})`;
  const where: SQL[] = [eq(productVariants.isActive, true), sql`${products.status} <> 'archived'`];
  if (sp.q) { const q = `%${sp.q.trim().replace(/[%_]/g, "\\$&")}%`; where.push(or(ilike(products.name, q), ilike(productVariants.sku, q))!); }
  if (sp.level === "low") where.push(sql`${avail} > 0 and ${avail} <= ${products.lowStockThreshold}`);
  if (sp.level === "out") where.push(sql`${avail} <= 0`);
  const cond = and(...where);

  const [rows, [{ n }], [counts]] = await Promise.all([
    db.select({
      id: productVariants.id, sku: productVariants.sku, size: productVariants.size, color: productVariants.color,
      stock: productVariants.stock, reserved: productVariants.reserved, productId: products.id, product: products.name, threshold: products.lowStockThreshold,
    }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
      .where(cond).orderBy(sql`${avail} asc`, asc(products.name)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(cond),
    db.select({
      low: sql<number>`count(*) filter (where ${avail} > 0 and ${avail} <= ${products.lowStockThreshold})::int`,
      out: sql<number>`count(*) filter (where ${avail} <= 0)::int`,
    }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(productVariants.isActive, true), sql`${products.status} <> 'archived'`)),
  ]);

  const variantId = sp.variant && /^[0-9a-f-]{36}$/i.test(sp.variant) ? sp.variant : null;
  const history = await db.select({
    at: inventoryMovements.createdAt, delta: inventoryMovements.delta, reason: inventoryMovements.reason, note: inventoryMovements.note,
    sku: productVariants.sku, actor: users.email, orderId: inventoryMovements.orderId,
  }).from(inventoryMovements).innerJoin(productVariants, eq(productVariants.id, inventoryMovements.variantId))
    .leftJoin(users, eq(users.id, inventoryMovements.actorId))
    .where(variantId ? eq(inventoryMovements.variantId, variantId) : undefined)
    .orderBy(desc(inventoryMovements.createdAt)).limit(variantId ? 200 : 30);

  const base = { q: sp.q, level: sp.level };
  const tab = (level: string | undefined, label: string) => (
    <Link href={`/admin/inventory${qs({ q: sp.q, level })}`} aria-current={sp.level === level ? "page" : undefined}
      className={`px-3 py-1.5 text-sm border ${sp.level === level ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/15 bg-white hover:border-aubergine"}`}>{label}</Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Available = stock minus units reserved by checkouts in progress. Every change is logged below."
        actions={<a href="/admin/inventory/export" className={btn.secondary}><Download size={15} />Export CSV</a>} />
      <div className="flex flex-wrap items-center gap-2">
        {tab(undefined, "All")}{tab("low", `Low stock (${counts.low})`)}{tab("out", `Out of stock (${counts.out})`)}
        <form className="ml-auto flex gap-2" role="search">
          {sp.level && <input type="hidden" name="level" value={sp.level} />}
          <input name="q" defaultValue={sp.q} placeholder="Product or SKU" className={`${inputCls} mt-0 w-56`} aria-label="Search inventory" />
          <button className={btn.secondary}>Search</button>
        </form>
      </div>

      {rows.length === 0 ? <Empty title={sp.level ? "Nothing here — stock levels look healthy" : "No variants yet"} body={sp.level ? undefined : "Variants appear once products are added."} /> : (
        <div className="overflow-x-auto bg-white border border-charcoal/10">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-charcoal/60 border-b border-charcoal/10">
              <tr><th className="p-3">Product</th><th className="p-3">Variant</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Available</th><th className="p-3">Adjust</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const a = r.stock - r.reserved;
                return (
                  <tr key={r.id} className="border-t border-charcoal/10 align-top">
                    <td className="p-3"><Link className="hover:underline" href={`/admin/products/${r.productId}`}>{r.product}</Link></td>
                    <td className="p-3"><span className="block">{[r.size, r.color].filter(Boolean).join(" / ") || "Default"}</span>
                      <Link href={`/admin/inventory${qs(base, { variant: r.id })}#history`} className="text-xs text-charcoal/50 hover:underline">{r.sku} · history</Link></td>
                    <td className="p-3 text-right tabular-nums">{r.stock}</td>
                    <td className="p-3 text-right tabular-nums text-charcoal/60">{r.reserved}</td>
                    <td className="p-3 text-right">{a <= 0 ? <Badge tone="out">0</Badge> : a <= r.threshold ? <Badge tone="low">{a}</Badge> : <span className="tabular-nums">{a}</span>}</td>
                    <td className="p-3"><StockAdjuster variantId={r.id} stock={r.stock} reserved={r.reserved} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={Math.ceil(n / PER)} href={(p) => `/admin/inventory${qs(base, { page: p })}`} />

      <Card title={variantId ? `Movement history · ${history[0]?.sku ?? "variant"}` : "Recent stock movements"}>
        <div id="history" className="overflow-x-auto">
          {history.length === 0 ? <p className="text-sm text-charcoal/60">No stock movements recorded yet.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-charcoal/60"><tr><th className="p-2">When</th><th className="p-2">SKU</th><th className="p-2 text-right">Change</th><th className="p-2">Reason</th><th className="p-2">Note</th><th className="p-2">By</th></tr></thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-t border-charcoal/10">
                    <td className="p-2 whitespace-nowrap">{h.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="p-2">{h.sku}</td>
                    <td className={`p-2 text-right tabular-nums ${h.delta < 0 ? "text-burgundy" : "text-emerald-800"}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</td>
                    <td className="p-2 capitalize">{h.reason}</td>
                    <td className="p-2 text-charcoal/70">{h.note ?? (h.orderId ? `Order ${h.orderId.slice(0, 8)}` : "—")}</td>
                    <td className="p-2 text-charcoal/70">{h.actor ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {variantId && <Link href={`/admin/inventory${qs(base)}`} className={`${btn.ghost} mt-3`}>Show all recent movements</Link>}
        </div>
      </Card>

      <CsvImport action={importStockCsv} title="Update stock from a CSV count"
        help="Columns: variant_sku, stock, note (optional). Sets each variant to the counted quantity and logs the difference as a stock count. Export the current inventory to get a ready-made sheet." />
    </div>
  );
}
