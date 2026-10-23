import Link from "next/link";
import Img from "./Img";
import { formatINR } from "@/lib/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders-sql";
import type { Addr, OrderFull } from "@/lib/order-view";
import { PayNow, CancelButton, ReturnRequest, ReviewForm } from "./OrderActions";

const TRACK: OrderStatus[] = ["confirmed", "packed", "shipped", "out_for_delivery", "delivered"];

export default function OrderDetail({ o, token, returnDays }: { o: OrderFull; token: string | null; returnDays: number }) {
  const status = o.status as OrderStatus;
  const stepIdx = TRACK.indexOf(status === "processing" ? "confirmed" : status);
  const ship = o.shippingAddress as Addr;
  const q = token ? `?t=${encodeURIComponent(token)}` : "";
  const canPay = status === "pending_payment" && o.paymentMethod === "razorpay" && o.reservedUntil && o.reservedUntil.getTime() > Date.now();
  const canCancel = (status === "pending_payment" && o.paymentStatus !== "paid") || (["confirmed", "processing"].includes(status) && o.paymentStatus !== "paid");
  const reviewable = ["delivered", "return_requested", "returned"].includes(status);

  return (
    <div className="space-y-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm text-charcoal/60">Order placed {o.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" })}</p>
          <h1 className="display mt-2 text-5xl">{o.orderNumber}</h1>
          <p className="mt-3 text-lg">{STATUS_LABEL[status]}{o.paymentMethod === "cod" && status !== "cancelled" ? " · Cash on delivery" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {o.invoiceNumber && <Link href={`/print/invoice/${o.id}${q}`} target="_blank" className="btn-outline">INVOICE</Link>}
          {canPay && <PayNow orderId={o.id} token={token} />}
          {canCancel && <CancelButton orderId={o.id} token={token} />}
        </div>
      </header>

      {status === "pending_payment" && (
        <p className="border border-gold bg-gold/10 px-4 py-3 text-sm">
          {canPay ? `Payment not received yet. Your items are held until ${o.reservedUntil!.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", timeStyle: "short" })}.` : "We're waiting to confirm your payment. If money was debited, this page will update shortly."}
        </p>
      )}
      {o.paymentStatus === "refunded" && <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">Refunded. Refunds usually reach your account within 5–7 working days.</p>}

      {stepIdx >= 0 && (
        <ol className="grid grid-cols-5 gap-2 text-center text-xs" aria-label="Delivery progress">
          {TRACK.map((s, i) => (
            <li key={s} aria-current={i === stepIdx ? "step" : undefined}>
              <span className={`mx-auto mb-2 block h-1 ${i <= stepIdx ? "bg-aubergine" : "bg-charcoal/15"}`} />
              <span className={i <= stepIdx ? "text-charcoal" : "text-charcoal/45"}>{STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}
      {(o.carrier || o.trackingNumber) && <p className="text-sm">Shipped with <strong>{o.carrier ?? "our courier"}</strong>{o.trackingNumber && <> · Tracking number <strong className="select-all">{o.trackingNumber}</strong></>}</p>}

      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="items-h">
          <h2 id="items-h" className="font-serif text-3xl mb-4">Items</h2>
          <ul className="divide-y divide-charcoal/10 border-y border-charcoal/10">
            {o.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-5">
                <Img src={i.imageUrl} alt="" width={200} sizes="80px" className="h-28 w-20 object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-serif text-lg">{i.productName}</p>
                  <p className="text-charcoal/60">{[i.color, i.size && `Size ${i.size}`, `Qty ${i.quantity}`].filter(Boolean).join(" · ")}</p>
                  {reviewable && i.productId && (o.reviewedItemIds.has(i.id) ? <p className="mt-2 text-xs text-charcoal/55">Reviewed — thank you.</p> : <div className="mt-2"><ReviewForm itemId={i.id} token={token} /></div>)}
                </div>
                <p className="text-sm tabular-nums">{formatINR(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          {status === "delivered" && <div className="mt-8"><ReturnRequest orderId={o.id} token={token} days={returnDays} /></div>}
          {status === "return_requested" && <p className="mt-8 text-sm">Return requested{o.returnReason ? ` — “${o.returnReason}”` : ""}. We&apos;ll be in touch about pickup.</p>}
        </section>
        <aside className="space-y-8 text-sm">
          <dl className="space-y-2 border border-gold/30 bg-white p-6">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
            {Number(o.discountTotal) > 0 && <div className="flex justify-between"><dt>Discount {o.couponCode && `(${o.couponCode})`}</dt><dd>− {formatINR(o.discountTotal)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{Number(o.shippingTotal) === 0 ? "Free" : formatINR(o.shippingTotal)}</dd></div>
            {Number(o.shippingTax) > 0 && <div className="flex justify-between"><dt>GST on shipping</dt><dd>{formatINR(o.shippingTax)}</dd></div>}
            <div className="flex justify-between border-t border-charcoal/10 pt-2 text-base"><dt>Total</dt><dd>{formatINR(o.grandTotal)}</dd></div>
            <p className="text-xs text-charcoal/55">Includes GST {formatINR(Number(o.cgstTotal) + Number(o.sgstTotal) + Number(o.igstTotal))}</p>
          </dl>
          <div><h3 className="font-serif text-xl mb-2">Delivering to</h3>
            <p className="leading-relaxed text-charcoal/75">{ship.fullName}<br />{ship.line1}{ship.line2 ? `, ${ship.line2}` : ""}<br />{ship.city}, {ship.state} {ship.pincode}<br />{ship.phone}</p></div>
          <p className="text-charcoal/60">Questions? <Link href="/contact" className="underline">Contact us</Link> with your order number.</p>
        </aside>
      </div>
    </div>
  );
}
