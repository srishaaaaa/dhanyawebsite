import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getCustomer } from "@/lib/customer";
import { getSettings } from "@/lib/settings";
import CheckoutClient from "@/components/store/Checkout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [me, { shipping }] = await Promise.all([getCustomer(), getSettings()]);
  const saved = me ? await db.select().from(addresses).where(eq(addresses.userId, me.id)).orderBy(desc(addresses.isDefault)) : [];
  return (
    <div className="container-x py-12 pb-24">
      <h1 className="display text-5xl sm:text-6xl mb-10">Checkout</h1>
      <CheckoutClient email={me?.email ?? ""} signedIn={!!me} standardDays={shipping.deliveryDays ?? "4–7"} expressDays={shipping.expressDays ?? "1–3"}
        saved={saved.map((a) => ({ id: a.id, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))} />
    </div>
  );
}
