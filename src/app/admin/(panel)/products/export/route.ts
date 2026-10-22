import { NextResponse, type NextRequest } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants, categories } from "@/db/schema";
import { getStaff } from "@/lib/authz";
import { toCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
const HEADERS = ["sku", "name", "slug", "price", "compare_at_price", "gst_rate", "hsn_code", "status", "category_slug", "tags", "description", "variant_sku", "size", "color", "color_hex", "stock", "reserved"];

export async function GET(req: NextRequest) {
  const me = await getStaff("staff", "products");
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (req.nextUrl.searchParams.get("template")) {
    return csv(toCsv(HEADERS, [{ sku: "DB-KURTA-001", name: "Example kurta set", slug: "example-kurta-set", price: "2499.00", gst_rate: "5", status: "draft", category_slug: "", tags: "cotton|festive", variant_sku: "DB-KURTA-001-M", size: "M", color: "Wine", color_hex: "#54162F", stock: "5" }]), "products-template.csv");
  }
  const rows = await db.select({
    sku: products.sku, name: products.name, slug: products.slug, price: products.price, compare_at_price: products.compareAtPrice,
    gst_rate: products.gstRate, hsn_code: products.hsnCode, status: products.status, category_slug: categories.slug, tags: products.tags,
    description: products.description, variant_sku: productVariants.sku, size: productVariants.size, color: productVariants.color,
    color_hex: productVariants.colorHex, stock: productVariants.stock, reserved: productVariants.reserved,
  }).from(products)
    .leftJoin(productVariants, sql`${productVariants.productId} = ${products.id} and ${productVariants.isActive}`)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .orderBy(asc(products.sku), asc(productVariants.sku));
  await audit(me.id, "product.export", "product", null, { rows: rows.length });
  return csv(toCsv(HEADERS, rows), `dhanya-products-${new Date().toISOString().slice(0, 10)}.csv`);
}

function csv(body: string, name: string) {
  return new NextResponse(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });
}
