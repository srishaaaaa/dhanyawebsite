import { eq } from "drizzle-orm";
import { db } from "@/db";
import { navigationMenus } from "@/db/schema";
import StoreProviders from "@/components/store/StoreProviders";
import Header, { type NavItem } from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import CartDrawer from "@/components/store/CartDrawer";
import RevealObserver from "@/components/store/Reveal";
import CursorMagnet from "@/components/store/CursorMagnet";
import { getSettings } from "@/lib/settings";
import { getVisibleCollections, getVisibleCategories } from "@/lib/catalog/queries";
import { getActiveCampaigns } from "@/lib/campaigns";
import { getBrand } from "@/lib/brand";
import { getStaff } from "@/lib/authz";
import { Monogram } from "@/components/store/Wordmark";

export const revalidate = 60;

const DEFAULT_NAV: NavItem[] = [
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "New arrivals", href: "/shop?sort=newest" },
  { label: "Our story", href: "/about" },
];

async function menu(location: "header" | "footer"): Promise<NavItem[]> {
  try {
    const [m] = await db.select({ items: navigationMenus.items }).from(navigationMenus).where(eq(navigationMenus.location, location)).limit(1);
    return ((m?.items as NavItem[] | undefined) ?? []).filter((i) => i?.label && typeof i.href === "string" && (i.href.startsWith("/") || i.href.startsWith("https://"))).slice(0, 10);
  } catch { return []; }
}
const headerNav = async () => { const m = await menu("header"); return m.length ? m : DEFAULT_NAV; };
const footerNav = () => menu("footer");

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { brand, maintenance } = await getBrand();
  // Maintenance mode: shoppers see a holding page; signed-in staff browse normally with a reminder.
  const staffPreview = maintenance.enabled ? Boolean(await getStaff()) : false;
  if (maintenance.enabled && !staffPreview) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-aubergine px-6 text-center text-ivory">
        <Monogram className="h-20 w-20 text-gold" />
        <h1 className="mt-8 font-serif text-5xl font-light tracking-wordmark pl-[0.35em]">DHANYA</h1>
        <p className="mt-6 max-w-md text-ivory/80">{maintenance.message || "We're refreshing the boutique and will be back shortly."}</p>
      </main>
    );
  }
  const [{ store }, nav, cols, ann, footer, cats] = await Promise.all([getSettings(), headerNav(), getVisibleCollections().catch(() => []), getActiveCampaigns("announcement"), footerNav(), getVisibleCategories(false).catch(() => [])]);
  const announcements = ann.length ? ann.map((a) => a.content) : store.announcement ? [{ text: store.announcement }] : [];
  return (
    <StoreProviders>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-ivory focus:px-4 focus:py-2">Skip to content</a>
      <RevealObserver />
      <CursorMagnet />
      {staffPreview && <p className="bg-gold px-4 py-1.5 text-center text-xs text-aubergine">Maintenance mode is on — shoppers see the holding page. <a href="/admin/settings?tab=maintenance" className="underline">Turn it off</a></p>}
      <Header nav={nav} announcements={announcements} logo={brand.logoUrl ? { url: brand.logoUrl, alt: brand.logoAlt || "DHANYA BOUTIQUE" } : null}
        collections={cols.map((c) => ({ title: c.title, slug: c.slug, imageUrl: c.imageUrl }))} categories={cats.filter((c) => !c.parentId).map((c) => ({ name: c.name, slug: c.slug }))} />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer store={store} collections={cols} extra={footer} paymentsLive={Boolean(process.env.RAZORPAY_KEY_ID && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)} />
      <CartDrawer />
    </StoreProviders>
  );
}
