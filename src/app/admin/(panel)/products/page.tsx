import Link from "next/link";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Download, Plus } from "lucide-react";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { PageHeader, Empty, Pagination, qs, btn, inputCls } from "@/components/admin/ui";
import ProductTable from "@/components/admin/ProductTable";
import CsvImport from "@/components/admin/CsvImport";
import { importProductsCsv } from "./import-action";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };
const PER = 25;

type SP = { q?: string; status?: string; category?: string; sort?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSection("products");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: SQL[] = [];
  if (sp.q) {
    const q = `%${sp.q.trim().replace(/[%_]/g, "\\$&")}%`;
    where.push(or(ilike(products.name, q), ilike(products.sku, q), sql`exists (select 1 from product_variants v where v.product_id = ${products.id} and v.sku ilike ${q})`)!);
  }
  if (sp.status === "active" || sp.status === "draft" || sp.status === "archived") where.push(eq(products.status, sp.status));
  else where.push(sql`${products.status} <> 'archived'`);
  if (sp.category && /^[0-9a-f-]{36}$/i.test(sp.category)) where.push(eq(products.categoryId, sp.category));
  const order = sp.sort === "name" ? asc(products.name) : sp.sort === "price" ? asc(products.price) : desc(products.updatedAt);
  const cond = and(...where);

  const [rows, [{ n }], cats] = await Promise.all([
    db.select({
      id: products.id, name: products.name, sku: products.sku, status: products.status, price: products.price,
      publishAt: products.publishAt, category: categories.name, isFeatured: products.isFeatured, isBestseller: products.isBestseller,
      isNewArrival: products.isNewArrival, threshold: products.lowStockThreshold,
      image: sql<string | null>`(select url from product_images i where i.product_id = ${products.id} order by sort_order limit 1)`,
      stock: sql<number>`coalesce((select sum(stock - reserved) from product_variants v where v.product_id = ${products.id} and v.is_active), 0)::int`,
      variants: sql<number>`(select count(*) from product_variants v where v.product_id = ${products.id} and v.is_active)::int`,
    }).from(products).leftJoin(categories, eq(categories.id, products.categoryId))
      .where(cond).orderBy(order).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(cond),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
  ]);
  const base = { q: sp.q, status: sp.status, category: sp.category, sort: sp.sort };

  return (
    <div>
      <PageHeader title="Products" description={`${n} product${n === 1 ? "" : "s"}${sp.status ? ` · ${sp.status}` : ""}`}
        actions={<>
          <a href={`/admin/products/export${qs(base)}`} className={btn.secondary}><Download size={15} />Export CSV</a>
          <Link href="/admin/products/new" className={btn.primary}><Plus size={15} />Add product</Link>
        </>} />

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_160px_200px_160px_auto]" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search name or SKU" className={`${inputCls} mt-0`} aria-label="Search products" />
        <select name="status" defaultValue={sp.status ?? ""} className={`${inputCls} mt-0`} aria-label="Status">
          <option value="">Draft and active</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <select name="category" defaultValue={sp.category ?? ""} className={`${inputCls} mt-0`} aria-label="Category">
          <option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="sort" defaultValue={sp.sort ?? ""} className={`${inputCls} mt-0`} aria-label="Sort">
          <option value="">Recently updated</option><option value="name">Name</option><option value="price">Price</option>
        </select>
        <button className={btn.secondary}>Apply</button>
      </form>

      {rows.length === 0 ? (
        n === 0 && !sp.q && !sp.status && !sp.category
          ? <Empty title="Your catalogue is empty" body="Add your first product, or import a CSV." action={{ href: "/admin/products/new", label: "Add product" }} />
          : <Empty title="No products match these filters" body="Try a different search or clear the filters." />
      ) : (
        <ProductTable rows={rows.map((r) => ({ ...r, publishAt: r.publishAt?.toISOString() ?? null }))} />
      )}
      <Pagination page={page} pages={Math.ceil(n / PER)} href={(p) => `/admin/products${qs(base, { page: p })}`} />

      <div className="mt-10">
        <CsvImport action={importProductsCsv} title="Import products from CSV"
          help="Columns: sku, name, slug, price, compare_at_price, gst_rate, hsn_code, status, category_slug, tags (pipe-separated), description, variant_sku, size, color, color_hex, stock. One row per variant; rows sharing a product sku form one product. Existing SKUs are updated. Stock on existing variants is set and logged as a correction."
          template="/admin/products/export?template=1" />
      </div>
    </div>
  );
}
