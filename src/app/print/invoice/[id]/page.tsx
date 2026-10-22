import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/customer";
import { loadOrder, type Addr } from "@/lib/order-view";
import { canViewOrder } from "@/lib/order-access";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/money";
import { PrintButton } from "@/components/PrintShell";

export const metadata: Metadata = { title: "Tax invoice", robots: { index: false } };
export const dynamic = "force-dynamic";

const fmt = (n: string | number) => Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** GST tax invoice generated from the stored (server-verified) order snapshot. */
export default async function Invoice({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const [o, me, { tax, store }] = await Promise.all([loadOrder(id), getCustomer(), getSettings()]);
  if (!o || !o.invoiceNumber || !(await canViewOrder(o, { uid: me?.id ?? null, token: t ?? null }))) notFound();
  const bill = o.billingAddress as Addr, ship = o.shippingAddress as Addr;
  const inter = Number(o.igstTotal) > 0;
  const taxable = o.items.reduce((a, i) => a + Number(i.taxableValue), 0);
  return (
    <main className="mx-auto max-w-[820px] bg-white p-10 text-[13px] text-charcoal print:p-0">
      <PrintButton />
      <header className="flex items-start justify-between border-b border-charcoal/20 pb-6">
        <div>
          <p className="font-serif text-3xl tracking-[0.3em]">DHANYA</p>
          <p className="mt-2 font-medium">{tax.legalName || store.name}</p>
          {tax.address && <p className="whitespace-pre-line text-charcoal/70">{tax.address}</p>}
          {tax.state && <p className="text-charcoal/70">State: {tax.state}</p>}
          {tax.gstin ? <p>GSTIN: <strong>{tax.gstin}</strong></p> : <p className="text-burgundy print:hidden">GSTIN not set — add it in Admin → Taxes.</p>}
        </div>
        <div className="text-right">
          <h1 className="font-serif text-2xl">Tax invoice</h1>
          <p className="mt-2">Invoice no. <strong>{o.invoiceNumber}</strong></p>
          <p>Date: {(o.invoiceIssuedAt ?? o.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}</p>
          <p>Order: {o.orderNumber}</p>
          <p>Place of supply: {ship.state}</p>
        </div>
      </header>
      <section className="grid grid-cols-2 gap-8 border-b border-charcoal/20 py-5">
        <div><p className="mb-1 text-xs text-charcoal/60">Bill to</p><p className="font-medium">{bill.fullName}</p><p>{bill.line1}{bill.line2 ? `, ${bill.line2}` : ""}<br />{bill.city}, {bill.state} {bill.pincode}<br />{o.email} · {bill.phone}</p></div>
        <div><p className="mb-1 text-xs text-charcoal/60">Ship to</p><p className="font-medium">{ship.fullName}</p><p>{ship.line1}{ship.line2 ? `, ${ship.line2}` : ""}<br />{ship.city}, {ship.state} {ship.pincode}<br />{ship.phone}</p></div>
      </section>
      <table className="mt-5 w-full border-collapse">
        <thead><tr className="border-b border-charcoal/30 text-left text-xs">
          <th className="py-2">Item</th><th>HSN</th><th className="text-right">Qty</th><th className="text-right">Rate (incl.)</th><th className="text-right">Discount</th><th className="text-right">Taxable</th><th className="text-right">GST</th>{inter ? <th className="text-right">IGST</th> : <><th className="text-right">CGST</th><th className="text-right">SGST</th></>}<th className="text-right">Total</th>
        </tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-charcoal/10 align-top">
              <td className="py-2 pr-2">{i.productName}<br /><span className="text-xs text-charcoal/60">{i.sku}{i.size ? ` · ${i.size}` : ""}{i.color ? ` · ${i.color}` : ""}</span></td>
              <td>{i.hsnCode ?? "—"}</td><td className="text-right">{i.quantity}</td><td className="text-right">{fmt(i.unitPrice)}</td><td className="text-right">{fmt(i.discount)}</td>
              <td className="text-right">{fmt(i.taxableValue)}</td><td className="text-right">{Number(i.gstRate)}%</td>
              {inter ? <td className="text-right">{fmt(i.igst)}</td> : <><td className="text-right">{fmt(i.cgst)}</td><td className="text-right">{fmt(i.sgst)}</td></>}
              <td className="text-right">{fmt(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-5 w-72 space-y-1">
        <p className="flex justify-between"><span>Taxable value</span><span>{fmt(taxable)}</span></p>
        {inter ? <p className="flex justify-between"><span>IGST</span><span>{fmt(o.igstTotal)}</span></p>
          : <><p className="flex justify-between"><span>CGST</span><span>{fmt(o.cgstTotal)}</span></p><p className="flex justify-between"><span>SGST</span><span>{fmt(o.sgstTotal)}</span></p></>}
        <p className="flex justify-between"><span>Shipping</span><span>{fmt(o.shippingTotal)}</span></p>
        {Number(o.shippingTax) > 0 && <p className="flex justify-between"><span>GST on shipping (incl. above)</span><span>{fmt(o.shippingTax)}</span></p>}
        <p className="flex justify-between border-t border-charcoal/30 pt-2 text-base font-medium"><span>Total</span><span>{formatINR(o.grandTotal)}</span></p>
        <p className="text-xs text-charcoal/60">Payment: {o.paymentMethod === "cod" ? "Cash on delivery" : "Online (Razorpay)"} · {o.paymentStatus}</p>
      </div>
      <footer className="mt-12 border-t border-charcoal/20 pt-4 text-xs text-charcoal/60">This is a computer-generated invoice and does not require a signature.</footer>
    </main>
  );
}
