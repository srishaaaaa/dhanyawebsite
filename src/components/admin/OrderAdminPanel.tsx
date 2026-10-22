"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStatus, saveShipment, saveNotes, refundOrder, resendConfirmation, markCodCollected } from "@/app/admin/(panel)/orders/actions";
import { Card, Field, inputCls, btn } from "./ui";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders-sql";

type Props = { orderId: string; status: OrderStatus; next: OrderStatus[]; paymentMethod: string; paymentStatus: string; carrier: string; tracking: string; notes: string; refundable: number; canRefund: boolean };

export default function OrderAdminPanel(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [to, setTo] = useState<string>(p.next[0] ?? "");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [restock, setRestock] = useState(true);
  const [carrier, setCarrier] = useState(p.carrier);
  const [tracking, setTracking] = useState(p.tracking);
  const [notes, setNotes] = useState(p.notes);
  const [amount, setAmount] = useState(p.refundable ? String(p.refundable) : "");
  const [reason, setReason] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; message: string }>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => { const r = await fn(); setMsg({ ok: r.ok, text: r.message }); if (r.ok) router.refresh(); });
  };
  const warn = to === "cancelled" ? (p.status === "pending_payment" ? "Cancel and release the held stock?" : "Cancel this order and put the items back in stock?" + (p.paymentStatus === "paid" ? " The customer has paid — refund them afterwards." : "")) : undefined;

  return (
    <>
      {msg && <p role="status" className={`border px-3 py-2 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50" : "border-burgundy/30 bg-rose text-burgundy"}`}>{msg.text}</p>}
      <Card title="Fulfilment">
        {p.next.length === 0 ? <p className="text-sm text-charcoal/60">No further status changes.</p> : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => updateStatus(p.orderId, to, note, { notify, restock }), warn); }}>
            <Field label="Move to"><select className={inputCls} value={to} onChange={(e) => setTo(e.target.value)}>{p.next.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
            <Field label="Note (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            {to === "returned" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />Put returned items back in stock</label>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />Email the customer</label>
            {to === "delivered" && p.paymentMethod === "cod" && <p className="text-xs text-charcoal/60">Marking delivered also records the cash as collected.</p>}
            <button disabled={pending} className={to === "cancelled" ? btn.danger : btn.primary}>{pending ? "Saving…" : `Mark ${STATUS_LABEL[to as OrderStatus]?.toLowerCase() ?? ""}`}</button>
          </form>
        )}
        {p.paymentMethod === "cod" && p.paymentStatus === "pending" && !["cancelled", "pending_payment"].includes(p.status) && (
          <button disabled={pending} onClick={() => run(() => markCodCollected(p.orderId), "Mark the cash as collected?")} className={`${btn.ghost} mt-3`}>Mark cash collected</button>
        )}
      </Card>
      <Card title="Shipping">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => saveShipment(p.orderId, { carrier, trackingNumber: tracking })); }}>
          <Field label="Carrier"><input className={inputCls} list="carriers" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            <datalist id="carriers">{["Delhivery", "Blue Dart", "DTDC", "Ekart", "India Post", "Xpressbees", "Shadowfax", "Shiprocket"].map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Tracking number"><input className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
          <button disabled={pending} className={btn.secondary}>Save shipping details</button>
        </form>
      </Card>
      {p.canRefund && p.refundable > 0 && (
        <Card title="Refund">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => refundOrder(p.orderId, { amount, reason }), `Refund ₹${amount}? ${p.paymentMethod === "razorpay" ? "This sends money back through Razorpay and can't be undone." : "This records a manual refund."}`); }}>
            <Field label={`Amount (up to ₹${p.refundable.toLocaleString("en-IN")})`}><input inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="Reason"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <button disabled={pending} className={btn.danger}>Issue refund</button>
          </form>
        </Card>
      )}
      <Card title="Internal notes">
        <textarea rows={4} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Internal notes" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button disabled={pending} onClick={() => run(() => saveNotes(p.orderId, notes))} className={btn.secondary}>Save notes</button>
          {p.status !== "pending_payment" && <button disabled={pending} onClick={() => run(() => resendConfirmation(p.orderId))} className={btn.ghost}>Resend confirmation email</button>}
        </div>
      </Card>
    </>
  );
}
