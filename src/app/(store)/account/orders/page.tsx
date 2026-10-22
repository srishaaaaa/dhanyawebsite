import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireCustomer } from "@/lib/customer";
import AccountLayout from "@/components/store/AccountNav";
import { formatINR } from "@/lib/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders-sql";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyOrders() {
  const me = await requireCustomer("/account/orders");
  // Only orders placed while signed in are listed. Guest orders are NOT linked by email, because emails aren't
  // verified at registration — anyone could otherwise register someone else's address and see their orders.
  const list = await db.select({ id: orders.id, n: orders.orderNumber, at: orders.createdAt, status: orders.status, total: orders.grandTotal,
    items: sql<number>`(select coalesce(sum(quantity),0) from order_items oi where oi.order_id = ${orders.id})::int` })
    .from(orders).where(eq(orders.userId, me.id)).orderBy(desc(orders.createdAt)).limit(100);
  return (
    <AccountLayout active="/account/orders" name={me.name}>
      <p className="mb-6 text-xs text-charcoal/55">Orders placed as a guest are opened from the link in your confirmation email.</p>
      {list.length === 0 ? (
        <div className="py-10"><p className="font-serif text-3xl">No orders yet</p><Link href="/shop" className="btn-primary mt-8">START SHOPPING</Link></div>
      ) : (
        <ul className="divide-y divide-charcoal/10 border-y border-charcoal/10">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="grid grid-cols-2 gap-2 py-5 text-sm hover:bg-white/60 sm:grid-cols-4 sm:items-center">
                <span className="font-serif text-xl">{o.n}</span>
                <span className="text-charcoal/60">{o.at.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.items} item{o.items === 1 ? "" : "s"}</span>
                <span>{STATUS_LABEL[o.status as OrderStatus]}</span>
                <span className="text-right tabular-nums">{formatINR(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  );
}
