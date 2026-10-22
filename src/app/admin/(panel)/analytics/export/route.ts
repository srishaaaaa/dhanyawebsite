import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/authz";
import { resolveRange, istDate } from "@/lib/date-range";
import { toCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";
import { dailySales, productPerformance } from "../reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getStaff("admin", "analytics");
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { from, to } = resolveRange(sp);
  const report = sp.report === "products" ? "products" : "daily";
  const rows: Record<string, unknown>[] = report === "products" ? await productPerformance(from, to) : await dailySales(from, to);
  await audit(me.id, `report.export.${report}`, "report", null, { from: istDate(from), to: istDate(to) });
  const headers = report === "products" ? ["name", "units", "orders", "revenue", "returned", "available", "product_id"] : ["day", "orders", "units", "gross", "discounts", "shipping", "gst", "refunds", "net"];
  return new NextResponse(toCsv(headers, rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="dhanya-${report}-${istDate(from)}-to-${istDate(to)}.csv"`, "cache-control": "no-store" } });
}
