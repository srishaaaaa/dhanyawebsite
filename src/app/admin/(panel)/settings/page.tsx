import Link from "next/link";
import { requireSection } from "@/lib/authz";
import { getSettings } from "@/lib/settings";
import { getBrand } from "@/lib/brand";
import { PageHeader } from "@/components/admin/ui";
import SettingsForm from "@/components/admin/SettingsForm";
import BrandForm from "@/components/admin/BrandForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store settings" };

export default async function StoreSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireSection("settings", "admin");
  const tab = (await searchParams).tab ?? "store";
  const [{ store }, { brand, maintenance }] = await Promise.all([getSettings(), getBrand()]);
  const tabs = [["store", "Store"], ["brand", "Brand"], ["maintenance", "Maintenance"]] as const;
  return (
    <div>
      <PageHeader title="Store settings" description="Currency is INR and the timezone is India Standard Time. Shipping, taxes and payments have their own pages." />
      <nav className="mb-6 flex gap-2" aria-label="Settings sections">{tabs.map(([k, l]) => <Link key={k} href={`/admin/settings?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`border px-3 py-1.5 text-sm ${tab === k ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/15 bg-white"}`}>{l}</Link>)}</nav>
      {tab === "brand" ? <BrandForm initial={brand} />
        : tab === "maintenance" ? (
          <SettingsForm settingKey="maintenance" values={maintenance as Record<string, unknown>} groups={[{ title: "Maintenance mode", fields: [
            { name: "enabled", label: "Show a maintenance page to shoppers", type: "checkbox", hint: "Signed-in staff still see the full store with a reminder banner. Checkout is paused." },
            { name: "message", label: "Message", type: "textarea", placeholder: "We're refreshing the boutique and will be back shortly." },
          ] }]} />
        ) : (
          <SettingsForm settingKey="store" values={{ ...store, "social.instagram": store.social?.instagram, "social.facebook": store.social?.facebook, "social.pinterest": store.social?.pinterest, "social.youtube": store.social?.youtube }} groups={[
            { title: "Store", fields: [{ name: "name", label: "Store name" }, { name: "email", label: "Customer email", type: "email" }, { name: "phone", label: "Phone" }, { name: "whatsapp", label: "WhatsApp number", hint: "Shows a WhatsApp link in the footer and contact page" }, { name: "address", label: "Shop address", type: "textarea", hint: "Shown on Contact and in the Visit us map at the bottom of every page. Leave blank to hide the map." }, { name: "hours", label: "Opening hours (text)", placeholder: "Mon – Sun · 10AM – 8PM" }, { name: "openFrom", label: "Opens at (24h)", placeholder: "10:00" }, { name: "openTo", label: "Closes at (24h)", placeholder: "20:00", hint: "Optional. Drives the live Open / Closed badge." }] },
            { title: "Announcement", fields: [{ name: "announcement", label: "Default announcement bar text", hint: "Used when no announcement campaign is running. Leave blank to hide." }] },
            { title: "Social links", fields: [{ name: "social.instagram", label: "Instagram", placeholder: "https://instagram.com/…" }, { name: "social.facebook", label: "Facebook" }, { name: "social.pinterest", label: "Pinterest" }, { name: "social.youtube", label: "YouTube" }] },
          ]} />
        )}
    </div>
  );
}
