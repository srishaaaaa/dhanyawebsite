import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { getStaff } from "@/lib/authz";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getStaff("staff", "inventory");
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select({
    variant_sku: productVariants.sku, product: products.name, size: productVariants.size, color: productVariants.color,
    stock: productVariants.stock, reserved: productVariants.reserved, active: productVariants.isActive, note: productVariants.sku,
  }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).orderBy(asc(products.name), asc(productVariants.sku));
  const body = toCsv(["variant_sku", "product", "size", "color", "stock", "reserved", "active", "note"], rows.map((r) => ({ ...r, note: "" })));
  return new NextResponse(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="dhanya-inventory-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
