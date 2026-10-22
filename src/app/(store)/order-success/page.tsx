import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/customer";
import { loadOrder } from "@/lib/order-view";
import { canViewOrder } from "@/lib/order-access";
import { formatINR } from "@/lib/money";
import { Monogram } from "@/components/store/Wordmark";
import { emailConfigured } from "@/lib/email";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Success({ searchParams }: { searchParams: Promise<{ order?: string; t?: string; pending?: string }> }) {
  const sp = await searchParams;
  const [o, me] = await Promise.all([loadOrder(sp.order ?? ""), getCustomer()]);
  if (!o || !(await canViewOrder(o, { uid: me?.id ?? null, token: sp.t ?? null }))) notFound();
  const confirmed = o.status !== "pending_payment" && o.status !== "cancelled";
  const link = `/orders/${o.id}${sp.t ? `?t=${encodeURIComponent(sp.t)}` : ""}`;
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-20 text-center">
      <div className="max-w-xl">
        <Monogram className="mx-auto h-16 w-16 text-gold" />
        <h1 className="display mt-8 text-5xl sm:text-6xl">{confirmed ? "Thank you" : "Almost there"}</h1>
        <p className="mt-5 text-charcoal/75">
          {confirmed
            ? <>Order <strong>{o.orderNumber}</strong> is confirmed{o.paymentMethod === "cod" ? ` — please keep ${formatINR(o.grandTotal)} ready on delivery` : ""}.{emailConfigured() ? ` A confirmation is on its way to ${o.email}.` : ""}</>
            : <>We&apos;re confirming the payment for order <strong>{o.orderNumber}</strong>. This usually takes a few seconds — the order page updates automatically once it&apos;s through.</>}
        </p>
        <p className="mt-3 text-sm text-charcoal/55">Bookmark your order page{me ? " or find it under your account" : ""} to track delivery.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={link} className="btn-primary">VIEW ORDER</Link>
          <Link href="/shop" className="btn-outline">CONTINUE SHOPPING</Link>
        </div>
      </div>
    </div>
  );
}
