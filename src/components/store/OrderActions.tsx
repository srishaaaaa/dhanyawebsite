"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder, requestReturn, submitReview } from "@/app/(store)/orders/actions";
import type { RazorpayParams } from "@/lib/checkout";


export function PayNow({ orderId, token }: { orderId: string; token: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function go() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/checkout/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, token }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(d.error ?? "Payment can't be retried."); setBusy(false); return; }
    const p: RazorpayParams = d.payment;
    if (!window.Razorpay) await new Promise<void>((res, rej) => { const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s); }).catch(() => setMsg("The payment window couldn't load."));
    if (!window.Razorpay) { setBusy(false); return; }
    new window.Razorpay({ key: p.keyId, order_id: p.razorpayOrderId, amount: p.amount, currency: p.currency, name: p.name, description: p.description, prefill: p.prefill, theme: { color: "#30042E" },
      handler: async (resp: Record<string, string>) => { await fetch("/api/checkout/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(resp) }); router.refresh(); },
      modal: { ondismiss: () => setBusy(false) } }).open();
  }
  return <div><button onClick={go} disabled={busy} className="btn-primary">{busy ? "OPENING…" : "PAY NOW"}</button>{msg && <p role="alert" className="mt-2 text-sm text-burgundy">{msg}</p>}</div>;
}

export function CancelButton({ orderId, token }: { orderId: string; token: string | null }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div>
      <button disabled={pending} className="btn-outline" onClick={() => { if (!confirm("Cancel this order?")) return; start(async () => { const r = await cancelOrder(orderId, token); setMsg(r.message); if (r.ok) router.refresh(); }); }}>{pending ? "CANCELLING…" : "CANCEL ORDER"}</button>
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

export function ReturnRequest({ orderId, token, days }: { orderId: string; token: string | null; days: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (msg?.ok) return <p role="status" className="text-sm text-emerald-800">{msg.text}</p>;
  if (!open) return <button className="btn-outline" onClick={() => setOpen(true)}>REQUEST A RETURN</button>;
  return (
    <form className="max-w-md space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await requestReturn(orderId, token, reason); setMsg({ ok: r.ok, text: r.message }); if (r.ok) router.refresh(); }); }}>
      <p className="text-sm text-charcoal/65">Returns are accepted within {days} days of delivery. Items should be unworn with tags attached.</p>
      <label className="block text-sm">Reason<textarea required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 w-full border border-charcoal/25 bg-white p-2" /></label>
      {msg && <p role="alert" className="text-sm text-burgundy">{msg.text}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "SENDING…" : "SUBMIT REQUEST"}</button>
    </form>
  );
}

export function ReviewForm({ itemId, token }: { itemId: string; token: string | null }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (msg?.ok) return <p role="status" className="text-xs text-emerald-800">{msg.text}</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs underline underline-offset-4">Write a review</button>;
  return (
    <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => { const r = await submitReview(itemId, token, { rating, title: fd.get("title"), body: fd.get("body") }); setMsg({ ok: r.ok, text: r.message }); }); }}>
      <fieldset><legend className="text-xs mb-1">Your rating</legend>
        <div className="flex gap-1" role="radiogroup">{[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className={`text-xl ${n <= rating ? "text-gold" : "text-charcoal/25"}`}>★</button>
        ))}</div>
      </fieldset>
      <input name="title" placeholder="Title (optional)" maxLength={120} className="w-full border border-charcoal/25 bg-white px-2 py-1.5 text-sm" />
      <textarea name="body" required minLength={10} rows={3} placeholder="What did you love? How was the fit?" className="w-full border border-charcoal/25 bg-white p-2 text-sm" />
      {msg && <p role="alert" className="text-xs text-burgundy">{msg.text}</p>}
      <button disabled={pending || rating === 0} className="btn-outline px-4 py-2">{pending ? "SENDING…" : "SUBMIT REVIEW"}</button>
    </form>
  );
}
