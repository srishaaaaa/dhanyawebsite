"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import Img from "./Img";
import { formatINR } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/india";
import type { RazorpayParams } from "@/lib/checkout";

type Addr = { fullName: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string };
type Saved = Addr & { id: string; isDefault: boolean };
type QLine = { variantId: string; name: string; size: string | null; color: string | null; image: string | null; quantity: number; netIncl: number; discount: number };
type QuoteRes = {
  lines: QLine[]; issues: string[]; couponError: string | null; methods: { cod: boolean; online: boolean; express: boolean };
  quote: { subtotal: number; discount: number; shipping: number; shippingTax: number; cgst: number; sgst: number; igst: number; taxTotal: number; grandTotal: number; interState: boolean; coupon: { code: string; applied: boolean; message: string } | null };
};

const EMPTY: Addr = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };
const field = "mt-1 w-full border border-charcoal/25 bg-white px-3.5 py-3 text-sm outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold";

export default function Checkout({ email: initialEmail, saved, signedIn, expressDays, standardDays }: { email: string; saved: Saved[]; signedIn: boolean; expressDays: string; standardDays: string }) {
  const router = useRouter();
  const def = saved.find((a) => a.isDefault) ?? saved[0];
  const [email, setEmail] = useState(initialEmail);
  const [ship, setShip] = useState<Addr>(def ? { ...def, line2: def.line2 ?? "" } : EMPTY);
  const [billSame, setBillSame] = useState(true);
  const [bill, setBill] = useState<Addr>(EMPTY);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [payment, setPayment] = useState<"razorpay" | "cod">("razorpay");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [q, setQ] = useState<QuoteRes | null>(null);
  const [qErr, setQErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [pendingPay, setPendingPay] = useState<{ orderId: string; token: string; params: RazorpayParams } | null>(null);
  const key = useRef<string>("");
  if (!key.current) key.current = crypto.randomUUID();

  const loadQuote = useCallback(async () => {
    try {
      const r = await fetch("/api/checkout/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ couponCode: coupon, state: ship.state || null, method, email: email || null }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setQ(d); setQErr(null);
    } catch (e) { setQErr((e as Error).message || "Couldn't load your order summary."); }
  }, [coupon, ship.state, method, email]);
  useEffect(() => { loadQuote(); }, [loadQuote]);
  useEffect(() => {
    if (!q) return;
    if (payment === "razorpay" && !q.methods.online && q.methods.cod) setPayment("cod");
    if (payment === "cod" && !q.methods.cod && q.methods.online) setPayment("razorpay");
    if (method === "express" && !q.methods.express) setMethod("standard");
  }, [q, payment, method]);
  useEffect(() => {
    if (!q?.methods.online || window.Razorpay) return;
    const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true; document.body.appendChild(s);
  }, [q?.methods.online]);

  const openRazorpay = useCallback((orderId: string, token: string, p: RazorpayParams) => {
    if (!window.Razorpay) { setBanner("The payment window couldn't load. Check your connection, then use “Pay now” below."); setPendingPay({ orderId, token, params: p }); return; }
    const rzp = new window.Razorpay({
      key: p.keyId, order_id: p.razorpayOrderId, amount: p.amount, currency: p.currency, name: p.name, description: p.description, prefill: p.prefill,
      theme: { color: "#30042E" },
      handler: async (resp: Record<string, string>) => {
        setPlacing(true); setBanner("Confirming your payment…");
        const r = await fetch("/api/checkout/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(resp) }).catch(() => null);
        const d = await r?.json().catch(() => ({}));
        router.push(`/order-success?order=${orderId}&t=${encodeURIComponent(token)}${d?.ok && !d?.pending ? "" : "&pending=1"}`);
      },
      modal: { ondismiss: () => { setPlacing(false); setPendingPay({ orderId, token, params: p }); setBanner("Payment wasn't completed. Your items are held for 30 minutes — you can try again."); } },
    });
    rzp.on("payment.failed", () => setBanner("The payment didn't go through. You can try again or choose another method."));
    rzp.open();
  }, [router]);

  async function place() {
    setBanner(null); setErrors({}); setPlacing(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        idempotencyKey: key.current, email, phone: ship.phone, shipping: ship, billingSame: billSame, billing: billSame ? undefined : bill,
        method, payment, couponCode: coupon, note: note || null,
      }) });
      const d = await r.json();
      if (!d.ok) {
        setErrors(d.fields ?? {}); setBanner(d.error ?? "Please check your details.");
        if (d.refresh) { key.current = crypto.randomUUID(); loadQuote(); }
        setPlacing(false); window.scrollTo({ top: 0, behavior: "smooth" }); return;
      }
      if (!d.payment) { router.push(`/order-success?order=${d.orderId}&t=${encodeURIComponent(d.token)}`); return; }
      openRazorpay(d.orderId, d.token, d.payment);
    } catch {
      setBanner("You appear to be offline. Nothing was charged — check your connection and try again."); setPlacing(false);
    }
  }

  const t = q?.quote;
  const blocked = !q || q.lines.length === 0 || q.issues.length > 0 || (!q.methods.online && !q.methods.cod);
  const A = useMemo(() => ({ ship, setShip, bill, setBill }), [ship, bill]);

  if (q && q.lines.length === 0 && !pendingPay) {
    return <div className="py-20 text-center"><p className="font-serif text-3xl">Your bag is empty</p><Link href="/shop" className="btn-primary mt-8">EXPLORE THE COLLECTION</Link></div>;
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
      <form className="space-y-12" onSubmit={(e) => { e.preventDefault(); place(); }} noValidate>
        {banner && <p role="alert" className="border border-burgundy/30 bg-rose/60 px-4 py-3 text-sm text-burgundy">{banner}</p>}
        {pendingPay && <button type="button" onClick={() => openRazorpay(pendingPay.orderId, pendingPay.token, pendingPay.params)} className="btn-primary">PAY NOW</button>}

        <section aria-labelledby="c-h">
          <div className="flex items-baseline justify-between"><h2 id="c-h" className="font-serif text-3xl">Contact</h2>
            {!signedIn && <Link href="/account/login?next=/checkout" className="text-sm underline">Sign in for faster checkout</Link>}</div>
          <label className="mt-5 block text-sm">Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} aria-invalid={!!errors.email} />
            {errors.email && <span className="text-xs text-burgundy">{errors.email}</span>}</label>
          <p className="mt-2 text-xs text-charcoal/55">We&apos;ll send your order confirmation and updates here.</p>
        </section>

        <section aria-labelledby="s-h">
          <h2 id="s-h" className="font-serif text-3xl">Delivery address</h2>
          {saved.length > 0 && (
            <label className="mt-5 block text-sm">Saved addresses
              <select className={field} defaultValue={def?.id} onChange={(e) => { const a = saved.find((x) => x.id === e.target.value); setShip(a ? { ...a, line2: a.line2 ?? "" } : EMPTY); }}>
                {saved.map((a) => <option key={a.id} value={a.id}>{a.fullName}, {a.line1}, {a.city}</option>)}<option value="">Use a new address</option>
              </select>
            </label>
          )}
          <AddressFields prefix="shipping" a={A.ship} set={A.setShip} errors={errors} />
        </section>

        <section aria-labelledby="b-h">
          <h2 id="b-h" className="font-serif text-3xl">Billing</h2>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={billSame} onChange={(e) => setBillSame(e.target.checked)} className="accent-aubergine" />Same as delivery address</label>
          {!billSame && <AddressFields prefix="billing" a={A.bill} set={A.setBill} errors={errors} />}
        </section>

        <section aria-labelledby="m-h">
          <h2 id="m-h" className="font-serif text-3xl">Delivery</h2>
          <div className="mt-5 space-y-3">
            <Radio name="method" checked={method === "standard"} onChange={() => setMethod("standard")} title="Standard delivery" sub={`${standardDays} working days`} right={t ? (t.shipping === 0 && method === "standard" ? "Free" : method === "standard" ? formatINR(t.shipping) : "") : ""} />
            {q?.methods.express && <Radio name="method" checked={method === "express"} onChange={() => setMethod("express")} title="Express delivery" sub={`${expressDays} working days`} right={method === "express" && t ? formatINR(t.shipping) : ""} />}
          </div>
          <label className="mt-6 block text-sm">Delivery note (optional)<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className={field} placeholder="Gate code, preferred time…" /></label>
        </section>

        <section aria-labelledby="p-h">
          <h2 id="p-h" className="font-serif text-3xl">Payment</h2>
          <div className="mt-5 space-y-3">
            {q?.methods.online && <Radio name="payment" checked={payment === "razorpay"} onChange={() => setPayment("razorpay")} title="UPI, cards, net banking or wallets" sub="Secure payment via Razorpay" />}
            {q?.methods.cod && <Radio name="payment" checked={payment === "cod"} onChange={() => setPayment("cod")} title="Cash on delivery" sub="Pay when your order arrives" />}
            {q && !q.methods.online && !q.methods.cod && <p className="text-sm text-burgundy">Payments aren&apos;t available right now. Please <Link href="/contact" className="underline">contact us</Link> to order.</p>}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-charcoal/55"><Lock size={12} />Card and UPI details are entered on Razorpay&apos;s secure page — we never see or store them.</p>
        </section>

        <button disabled={placing || blocked} className="btn-primary w-full py-4 lg:hidden">{placing ? "PLEASE WAIT…" : payment === "cod" ? "PLACE ORDER" : `PAY ${t ? formatINR(t.grandTotal) : ""}`}</button>
      </form>

      <aside aria-labelledby="sum-h" className="frame h-fit border border-gold/30 bg-white p-8 shadow-[0_40px_80px_-50px_rgb(var(--c-aubergine)/.5)] lg:sticky lg:top-28">
        <h2 id="sum-h" className="font-serif text-2xl">Order summary</h2>
        {qErr && <p role="alert" className="mt-3 text-sm text-burgundy">{qErr} <button onClick={loadQuote} className="underline">Retry</button></p>}
        {!q ? <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div> : (
          <>
            {q.issues.length > 0 && <ul role="alert" className="mt-4 space-y-1 border border-burgundy/30 bg-rose/50 p-3 text-sm text-burgundy">{q.issues.map((i) => <li key={i}>{i}</li>)}<li><Link href="/cart" className="underline">Update your bag</Link></li></ul>}
            <ul className="mt-5 divide-y divide-charcoal/10">
              {q.lines.map((l) => (
                <li key={l.variantId} className="flex gap-3 py-3 text-sm">
                  <span className="relative shrink-0"><Img src={l.image} alt="" width={160} sizes="56px" className="h-[72px] w-14 object-cover" />
                    <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-charcoal px-1 text-[10px] text-ivory">{l.quantity}</span></span>
                  <span className="flex-1"><span className="block">{l.name}</span><span className="text-xs text-charcoal/55">{[l.color, l.size].filter(Boolean).join(" · ")}</span></span>
                  <span className="tabular-nums">{formatINR(l.netIncl)}</span>
                </li>
              ))}
            </ul>
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim().toUpperCase() || null); }}>
              <input aria-label="Discount code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Discount code" className="flex-1 border border-charcoal/25 px-3 py-2 text-sm uppercase" />
              <button className="btn-outline px-4 py-2">APPLY</button>
            </form>
            {coupon && (q.couponError ? <p role="alert" className="mt-2 text-xs text-burgundy">{q.couponError} <button className="underline" onClick={() => { setCoupon(null); setCouponInput(""); }}>Remove</button></p>
              : <p className="mt-2 text-xs text-emerald-800">{t?.coupon?.message} <button className="underline" onClick={() => { setCoupon(null); setCouponInput(""); }}>Remove</button></p>)}
            {errors.couponCode && <p className="mt-1 text-xs text-burgundy">{errors.couponCode}</p>}
            {t && (
              <dl className="mt-6 space-y-2 text-sm">
                <Row k="Subtotal" v={formatINR(t.subtotal)} />
                {t.discount > 0 && <Row k={`Discount (${t.coupon?.code})`} v={`− ${formatINR(t.discount)}`} />}
                <Row k="Shipping" v={t.shipping === 0 ? "Free" : formatINR(t.shipping)} />
                {t.shippingTax > 0 && <Row k="GST on shipping" v={formatINR(t.shippingTax)} />}
                <div className="flex justify-between border-t border-charcoal/10 pt-3 text-base"><dt>Total</dt><dd className="tabular-nums">{formatINR(t.grandTotal)}</dd></div>
                <p className="text-xs text-charcoal/55">Includes GST of {formatINR(t.taxTotal)} ({t.interState ? "IGST" : ship.state ? "CGST + SGST" : "calculated for your state"}).</p>
              </dl>
            )}
            <button onClick={place} disabled={placing || blocked} className="btn-primary mt-6 hidden w-full py-4 lg:flex">{placing ? "PLEASE WAIT…" : payment === "cod" ? "PLACE ORDER" : `PAY ${t ? formatINR(t.grandTotal) : ""}`}</button>
            <p className="mt-3 text-center text-xs text-charcoal/55">By placing your order you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/returns" className="underline">returns policy</Link>.</p>
          </>
        )}
      </aside>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><dt className="text-charcoal/70">{k}</dt><dd className="tabular-nums">{v}</dd></div>;

function Radio({ name, checked, onChange, title, sub, right }: { name: string; checked: boolean; onChange: () => void; title: string; sub?: string; right?: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-4 border px-4 py-4 text-sm transition-colors ${checked ? "border-gold bg-white shadow-[0_0_0_1px_rgb(var(--c-gold))]" : "border-charcoal/20 hover:border-gold/60"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-aubergine" />
      <span className="flex-1"><span className="block">{title}</span>{sub && <span className="text-xs text-charcoal/55">{sub}</span>}</span>
      {right && <span className="tabular-nums">{right}</span>}
    </label>
  );
}

function AddressFields({ prefix, a, set, errors }: { prefix: string; a: Addr; set: (a: Addr) => void; errors: Record<string, string> }) {
  const f = (k: keyof Addr, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = false) => (
    <label className={`block text-sm ${span ? "sm:col-span-2" : ""}`}>{label}
      <input value={a[k]} onChange={(e) => set({ ...a, [k]: k === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value })} aria-invalid={!!errors[`${prefix}.${k}`]} className={field} {...props} />
      {errors[`${prefix}.${k}`] && <span className="text-xs text-burgundy">{errors[`${prefix}.${k}`]}</span>}
    </label>
  );
  const sec = prefix === "shipping" ? "shipping" : "billing";
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {f("fullName", "Full name", { autoComplete: `${sec} name`, required: true })}
      {f("phone", "Mobile number", { autoComplete: `${sec} tel`, inputMode: "tel", required: true })}
      {f("line1", "House / flat, street", { autoComplete: `${sec} address-line1`, required: true }, true)}
      {f("line2", "Area, landmark (optional)", { autoComplete: `${sec} address-line2` }, true)}
      {f("city", "City", { autoComplete: `${sec} address-level2`, required: true })}
      {f("pincode", "PIN code", { autoComplete: `${sec} postal-code`, inputMode: "numeric", required: true })}
      <label className="block text-sm sm:col-span-2">State
        <select value={a.state} onChange={(e) => set({ ...a, state: e.target.value })} autoComplete={`${sec} address-level1`} className={field} aria-invalid={!!errors[`${prefix}.state`]}>
          <option value="">Choose your state</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {errors[`${prefix}.state`] && <span className="text-xs text-burgundy">{errors[`${prefix}.state`]}</span>}
      </label>
    </div>
  );
}
