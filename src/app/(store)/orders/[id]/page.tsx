import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/customer";
import { loadOrder } from "@/lib/order-view";
import { canViewOrder } from "@/lib/order-access";
import { getSettings } from "@/lib/settings";
import OrderDetail from "@/components/store/OrderDetail";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const [o, me, { shipping }] = await Promise.all([loadOrder(id), getCustomer(), getSettings()]);
  // Same 404 for "doesn't exist" and "not yours", so order ids can't be probed.
  if (!o || !(await canViewOrder(o, { uid: me?.id ?? null, token: t ?? null }))) notFound();
  return <div className="container-x py-12 pb-24"><OrderDetail o={o} token={t ?? null} returnDays={shipping.returnWindowDays ?? 7} /></div>;
}
