import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, orders, addresses } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { Card, btn } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders-sql";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer" };

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("customers");
  const { id } = await params;
  const [u] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, joined: users.createdAt }).from(users).where(eq(users.id, id)).limit(1);
  if (!u) notFound();
  const [list, addr] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)).limit(100),
    db.select().from(addresses).where(eq(addresses.userId, id)),
  ]);
  const paid = list.filter((o) => o.paymentStatus === "paid").reduce((a, o) => a + Number(o.grandTotal), 0);
  return (
    <div className="space-y-6">
      <div><Link href="/admin/customers" className={btn.ghost}>← Customers</Link><h1 className="font-serif text-4xl text-aubergine">{u.name ?? u.email}</h1>
        <p className="text-sm text-charcoal/60">{u.email}{u.phone ? ` · ${u.phone}` : ""} · joined {u.joined.toLocaleDateString("en-IN")}</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-xs text-charcoal/60">Orders</p><p className="font-serif text-3xl">{list.length}</p></Card>
        <Card><p className="text-xs text-charcoal/60">Paid total</p><p className="font-serif text-3xl">{formatINR(paid)}</p></Card>
        <Card><p className="text-xs text-charcoal/60">Average order</p><p className="font-serif text-3xl">{formatINR(list.length ? paid / Math.max(1, list.filter((o) => o.paymentStatus === "paid").length) : 0)}</p></Card>
      </div>
      <Card title="Orders">
        {list.length === 0 ? <p className="text-sm text-charcoal/60">No orders yet.</p> : (
          <table className="w-full text-sm"><tbody>{list.map((o) => (
            <tr key={o.id} className="border-t border-charcoal/10"><td className="py-2"><Link href={`/admin/orders/${o.id}`} className="underline">{o.orderNumber}</Link></td>
              <td>{o.createdAt.toLocaleDateString("en-IN")}</td><td>{STATUS_LABEL[o.status as OrderStatus]}</td><td>{o.paymentStatus}</td><td className="text-right">{formatINR(o.grandTotal)}</td></tr>
          ))}</tbody></table>
        )}
      </Card>
      <Card title="Saved addresses">
        {addr.length === 0 ? <p className="text-sm text-charcoal/60">None saved.</p> : <ul className="grid gap-3 text-sm sm:grid-cols-2">{addr.map((a) => <li key={a.id} className="border border-charcoal/10 p-3">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</li>)}</ul>}
      </Card>
    </div>
  );
}
