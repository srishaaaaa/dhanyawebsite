import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users, refunds, payments } from "@/db/schema";
import { requireSection, hasRole } from "@/lib/authz";
import { loadOrder, type Addr } from "@/lib/order-view";
import { Card, Badge, btn } from "@/components/admin/ui";
import OrderAdminPanel from "@/components/admin/OrderAdminPanel";
import { formatINR } from "@/lib/money";
import { NEXT_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/orders-sql";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSection("orders");
  const o = await loadOrder((await params).id);
  if (!o) notFound();
  const ship = o.shippingAddress as Addr, bill = o.billingAddress as Addr;
  const actorIds = [...new Set(o.history.map((h) => h.actorId).filter(Boolean))] as string[];
  const actors = actorIds.length ? await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, actorIds)) : [];
  const who = (id: string | null) => (id ? actors.find((a) => a.id === id)?.email ?? "Staff" : "System / customer");
  const allRefunds = o.payments.length ? await db.select().from(refunds).innerJoin(payments, eq(payments.id, refunds.paymentId)).where(eq(payments.orderId, o.id)) : [];
  const paid = o.payments.find((p) => ["paid", "partially_refunded"].includes(p.status));
  const refunded = allRefunds.reduce((a, r) => a + Number(r.refunds.amount), 0);
  const status = o.status as OrderStatus;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/orders" className={btn.ghost}>← Orders</Link>
          <h1 className="font-serif text-4xl text-aubergine mt-1">{o.orderNumber}</h1>
          <p className="text-sm text-charcoal/60">{o.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" })}</p>
          <div className="mt-2 flex gap-2"><Badge tone="scheduled">{STATUS_LABEL[status]}</Badge><Badge tone={o.paymentStatus === "paid" ? "ok" : "draft"}>Payment {o.paymentStatus.replace("_", " ")}</Badge><Badge tone="muted">{o.paymentMethod === "cod" ? "Cash on delivery" : "Online"}</Badge></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {o.invoiceNumber && <a href={`/print/invoice/${o.id}`} target="_blank" className={btn.secondary}>Invoice {o.invoiceNumber}</a>}
          <a href={`/print/packing-slip/${o.id}`} target="_blank" className={btn.secondary}>Packing slip</a>
        </div>
      </div>

      {o.internalNotes?.includes("Payment received after") && <p role="alert" className="border border-burgundy/40 bg-rose px-4 py-3 text-sm text-burgundy">Payment arrived after this order was auto-cancelled. Refund it, or contact the customer.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6 min-w-0">
          <Card title="Items">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-charcoal/60"><tr><th className="pb-2">Item</th><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">GST</th><th className="text-right">Total</th></tr></thead>
              <tbody>{o.items.map((i) => (
                <tr key={i.id} className="border-t border-charcoal/10">
                  <td className="py-2">{i.productId ? <Link href={`/admin/products/${i.productId}`} className="hover:underline">{i.productName}</Link> : i.productName}<span className="block text-xs text-charcoal/50">{[i.size, i.color].filter(Boolean).join(" / ")}</span></td>
                  <td>{i.sku}</td><td className="text-right">{i.quantity}</td><td className="text-right">{formatINR(i.unitPrice)}</td>
                  <td className="text-right">{Number(i.gstRate)}%</td><td className="text-right">{formatINR(i.lineTotal)}</td>
                </tr>
              ))}</tbody>
            </table>
            <dl className="ml-auto mt-4 w-72 space-y-1 text-sm">
              {[["Subtotal", o.subtotal], ["Discount" + (o.couponCode ? ` (${o.couponCode})` : ""), `-${o.discountTotal}`], ["Shipping" + (o.shippingMethod ? ` (${o.shippingMethod})` : ""), o.shippingTotal], ["GST on shipping", o.shippingTax], ["CGST", o.cgstTotal], ["SGST", o.sgstTotal], ["IGST", o.igstTotal]]
                .filter(([, v]) => Number(String(v).replace("-", "")) !== 0).map(([k, v]) => <div key={k as string} className="flex justify-between"><dt className="text-charcoal/60">{k}</dt><dd>{String(v).startsWith("-") ? `− ${formatINR(String(v).slice(1))}` : formatINR(v as string)}</dd></div>)}
              <div className="flex justify-between border-t border-charcoal/10 pt-1 font-medium"><dt>Total</dt><dd>{formatINR(o.grandTotal)}</dd></div>
              {refunded > 0 && <div className="flex justify-between text-burgundy"><dt>Refunded</dt><dd>− {formatINR(refunded)}</dd></div>}
            </dl>
            <p className="text-xs text-charcoal/50">CGST/SGST/IGST are included in item totals.</p>
          </Card>

          <Card title="Timeline">
            <ol className="space-y-3 text-sm">
              {o.history.map((h) => (
                <li key={h.id} className="flex gap-4">
                  <span className="w-40 shrink-0 text-charcoal/55">{h.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</span>
                  <span><strong>{STATUS_LABEL[h.toStatus as OrderStatus]}</strong>{h.note && <> — {h.note}</>}<span className="block text-xs text-charcoal/50">{who(h.actorId)}</span></span>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Payments and refunds">
            {o.payments.length === 0 ? <p className="text-sm text-charcoal/60">No payment records.</p> : (
              <ul className="space-y-2 text-sm">
                {o.payments.map((p) => <li key={p.id}>{p.provider === "cod" ? "Cash on delivery" : "Razorpay"} · {formatINR(p.amount)} · <strong>{p.status}</strong>{p.providerPaymentId && <span className="text-charcoal/55"> · {p.providerPaymentId}</span>}{p.method && <span className="text-charcoal/55"> · {p.method}</span>}</li>)}
                {allRefunds.map(({ refunds: r }) => <li key={r.id} className="text-burgundy">Refund {formatINR(r.amount)} · {r.status}{r.providerRefundId ? ` · ${r.providerRefundId}` : ""} · {r.reason}</li>)}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <OrderAdminPanel
            orderId={o.id} status={status} next={NEXT_STATUSES[status]} paymentMethod={o.paymentMethod} paymentStatus={o.paymentStatus}
            carrier={o.carrier ?? ""} tracking={o.trackingNumber ?? ""} notes={o.internalNotes ?? ""}
            refundable={paid ? Math.max(0, Math.round((Number(paid.amount) - refunded) * 100) / 100) : 0} canRefund={hasRole(me.role, "admin")}
          />
          <Card title="Customer">
            <p className="text-sm">{ship.fullName}<br /><a className="underline" href={`mailto:${o.email}`}>{o.email}</a><br /><a href={`tel:${o.phone}`}>{o.phone}</a></p>
            {o.userId ? <Link href={`/admin/customers/${o.userId}`} className="mt-2 inline-block text-xs underline">View customer</Link> : <p className="mt-2 text-xs text-charcoal/50">Guest checkout</p>}
            {o.customerNote && <p className="mt-3 border-l-2 border-gold pl-3 text-sm">“{o.customerNote}”</p>}
            {o.returnReason && <p className="mt-3 border-l-2 border-burgundy pl-3 text-sm">Return reason: “{o.returnReason}”</p>}
          </Card>
          <Card title="Addresses">
            <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-1">
              <div><p className="text-xs text-charcoal/50">Ship to</p><p>{ship.line1}{ship.line2 ? `, ${ship.line2}` : ""}<br />{ship.city}, {ship.state} {ship.pincode}<br />{ship.phone}</p></div>
              <div><p className="text-xs text-charcoal/50">Bill to</p><p>{bill.fullName}<br />{bill.line1}{bill.line2 ? `, ${bill.line2}` : ""}<br />{bill.city}, {bill.state} {bill.pincode}</p></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
