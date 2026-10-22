import { requireSection } from "@/lib/authz";
import { getSettings } from "@/lib/settings";
import { PageHeader, Card } from "@/components/admin/ui";
import SettingsForm from "@/components/admin/SettingsForm";
import { INDIAN_STATES } from "@/lib/india";
import { financialYear } from "@/lib/orders-sql";

export const dynamic = "force-dynamic";
export const metadata = { title: "Taxes" };

export default async function TaxesPage() {
  await requireSection("taxes", "admin");
  const { tax } = await getSettings();
  return (
    <div className="space-y-6">
      <PageHeader title="Taxes and invoices" description="GST rates are set per product (Products → Pricing and tax). These details decide CGST + SGST vs IGST and appear on every tax invoice." />
      <Card><p className="text-sm">Orders delivered within <strong>{tax.state ?? "your state"}</strong> are charged CGST + SGST; orders to other states are charged IGST. Next invoice number looks like <strong>{(tax.invoicePrefix || "DB")}/{financialYear()}/000NN</strong>. Please confirm rates and invoice format with your accountant.</p></Card>
      <SettingsForm settingKey="tax" values={tax as Record<string, unknown>} groups={[
        { title: "Business details", fields: [{ name: "legalName", label: "Legal business name" }, { name: "gstin", label: "GSTIN", placeholder: "22AAAAA0000A1Z5" }, { name: "state", label: "State of registration", type: "select", options: [...INDIAN_STATES] }, { name: "address", label: "Registered address (printed on invoices)", type: "textarea" }] },
        { title: "Invoices", fields: [{ name: "invoicePrefix", label: "Invoice prefix", hint: "Numbers run continuously; issued invoices never change" }] },
      ]} />
    </div>
  );
}
