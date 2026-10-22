import { requireSection } from "@/lib/authz";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shipping" };

export default async function ShippingPage() {
  await requireSection("shipping", "admin");
  const { shipping } = await getSettings();
  return (
    <div>
      <PageHeader title="Shipping and returns" description="One flat rate across India, with optional free shipping and express delivery. Rates are recalculated on the server for every order." />
      <SettingsForm settingKey="shipping" values={shipping as Record<string, unknown>} groups={[
        { title: "Standard delivery", fields: [{ name: "flatFee", label: "Shipping fee (₹)", type: "number" }, { name: "freeShippingThreshold", label: "Free shipping over (₹)", type: "number", hint: "Order value after discounts, incl. GST. Blank = never free." }, { name: "deliveryDays", label: "Delivery estimate (working days)", placeholder: "4–7" }] },
        { title: "Express delivery", fields: [{ name: "expressFee", label: "Express fee (₹)", type: "number", hint: "Blank hides express at checkout" }, { name: "expressDays", label: "Express estimate (working days)", placeholder: "1–3" }] },
        { title: "Tax on shipping", fields: [{ name: "taxOnDelivery", label: "Charge GST on the shipping fee", type: "checkbox", hint: "Adds GST on top of the fee and shows it on the invoice" }, { name: "deliveryGstRate", label: "GST rate on shipping (%)", type: "number" }] },
        { title: "Returns", fields: [{ name: "returnWindowDays", label: "Return window (days after delivery)", type: "number", hint: "0 turns off online return requests" }] },
      ]} />
    </div>
  );
}
