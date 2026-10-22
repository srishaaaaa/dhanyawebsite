import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getStaff } from "@/lib/authz";
import { loadOrder, type Addr } from "@/lib/order-view";
import { PrintButton } from "@/components/PrintShell";

export const metadata: Metadata = { title: "Packing slip", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PackingSlip({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getStaff("staff", "orders"))) redirect("/admin/login");
  const o = await loadOrder((await params).id);
  if (!o) notFound();
  const ship = o.shippingAddress as Addr;
  return (
    <main className="mx-auto max-w-[700px] bg-white p-10 text-sm print:p-0">
      <PrintButton />
      <div className="flex justify-between border-b pb-4"><p className="font-serif text-2xl tracking-[0.3em]">DHANYA</p><div className="text-right"><p className="font-serif text-xl">Packing slip</p><p>{o.orderNumber}</p><p>{o.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p></div></div>
      <div className="py-5"><p className="text-xs text-charcoal/60">Ship to</p><p className="text-base font-medium">{ship.fullName}</p><p>{ship.line1}{ship.line2 ? `, ${ship.line2}` : ""}<br />{ship.city}, {ship.state} {ship.pincode}<br />{ship.phone}</p>
        {o.paymentMethod === "cod" && o.paymentStatus !== "paid" && <p className="mt-3 border-2 border-charcoal px-3 py-2 text-base font-semibold inline-block">COLLECT CASH: ₹{Number(o.grandTotal).toLocaleString("en-IN")}</p>}
        {o.customerNote && <p className="mt-3">Note: {o.customerNote}</p>}</div>
      <table className="w-full border-collapse"><thead><tr className="border-b text-left text-xs"><th className="py-2">✓</th><th>Item</th><th>SKU</th><th>Size / colour</th><th className="text-right">Qty</th></tr></thead>
        <tbody>{o.items.map((i) => <tr key={i.id} className="border-b"><td className="py-3">☐</td><td>{i.productName}</td><td>{i.sku}</td><td>{[i.size, i.color].filter(Boolean).join(" / ")}</td><td className="text-right text-base">{i.quantity}</td></tr>)}</tbody></table>
      <p className="mt-10 text-xs text-charcoal/60">Thank you for shopping with DHANYA BOUTIQUE.</p>
    </main>
  );
}
