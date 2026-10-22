import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { reviews, products, users } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { PageHeader, Empty, Pagination, qs } from "@/components/admin/ui";
import ReviewModeration from "@/components/admin/ReviewModeration";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };
const PER = 30;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireSection("reviews");
  const sp = await searchParams;
  const status = (["pending", "approved", "rejected"].includes(sp.status ?? "") ? sp.status : "pending") as "pending" | "approved" | "rejected";
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, counts] = await Promise.all([
    db.select({ id: reviews.id, rating: reviews.rating, title: reviews.title, body: reviews.body, at: reviews.createdAt, featured: reviews.isFeatured,
      verified: sql<boolean>`${reviews.orderItemId} is not null`, product: products.name, productId: products.id, author: users.email })
      .from(reviews).innerJoin(products, eq(products.id, reviews.productId)).leftJoin(users, eq(users.id, reviews.userId))
      .where(eq(reviews.status, status)).orderBy(desc(reviews.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ s: reviews.status, n: sql<number>`count(*)::int` }).from(reviews).groupBy(reviews.status),
  ]);
  const count = (s: string) => counts.find((c) => c.s === s)?.n ?? 0;
  return (
    <div>
      <PageHeader title="Reviews" description="Only approved reviews appear on the storefront. Featured reviews show on the homepage. Reviews can only be written by customers whose order was delivered." />
      <div className="mb-5 flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <Link key={s} href={`/admin/reviews?status=${s}`} className={`border px-3 py-1.5 text-sm capitalize ${status === s ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/15 bg-white"}`}>{s} ({count(s)})</Link>
        ))}
      </div>
      {rows.length === 0 ? <Empty title={status === "pending" ? "Nothing waiting for review" : `No ${status} reviews`} /> : <ReviewModeration status={status} rows={rows.map((r) => ({ ...r, at: r.at.toISOString() }))} />}
      <Pagination page={page} pages={Math.ceil(count(status) / PER)} href={(p) => `/admin/reviews${qs({ status }, { page: p })}`} />
    </div>
  );
}
