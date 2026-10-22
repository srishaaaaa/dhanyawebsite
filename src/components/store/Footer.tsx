import Link from "next/link";
import { NewsletterForm } from "./Forms";
import { Monogram } from "./Wordmark";
import type { StoreInfo } from "@/lib/settings";

type Col = { title: string; links: { label: string; href: string }[] };

export default function Footer({ store, collections, paymentsLive, extra = [] }: { store: StoreInfo; collections: { title: string; slug: string }[]; paymentsLive: boolean; extra?: { label: string; href: string }[] }) {
  const cols: Col[] = [
    { title: "Shop", links: [{ label: "All pieces", href: "/shop" }, ...collections.slice(0, 5).map((c) => ({ label: c.title, href: `/collections/${c.slug}` })), { label: "All collections", href: "/collections" }] },
    { title: "Help", links: [{ label: "Contact us", href: "/contact" }, { label: "Shipping and delivery", href: "/shipping-policy" }, { label: "Returns and exchanges", href: "/returns" }, { label: "Size guide", href: "/size-guide" }, { label: "FAQs", href: "/faq" }] },
    { title: "The house", links: [{ label: "About Dhanya", href: "/about" }, ...extra, { label: "Privacy policy", href: "/privacy" }, { label: "Terms and conditions", href: "/terms" }] },
  ];
  const social = Object.entries(store.social ?? {}).filter(([, v]) => v && /^https:\/\//.test(v));
  return (
    <footer className="bg-aubergine text-ivory">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 pt-20 pb-10">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Monogram className="h-14 w-14 text-gold" />
            <p className="mt-6 font-serif text-3xl leading-tight max-w-sm">Letters from the atelier — new arrivals and private previews.</p>
            <div className="mt-6"><NewsletterForm /></div>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {cols.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h2 className="text-sm text-gold mb-4">{c.title}</h2>
                <ul className="space-y-2.5 text-sm text-ivory/75">{c.links.map((l) => <li key={l.href + l.label}><Link href={l.href} className="hover:text-ivory">{l.label}</Link></li>)}</ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-16 grid gap-6 border-t border-ivory/15 pt-8 text-xs text-ivory/60 md:grid-cols-3 md:items-center">
          <div className="space-y-1">
            {store.email && <p><a href={`mailto:${store.email}`} className="hover:text-ivory">{store.email}</a></p>}
            {store.phone && <p><a href={`tel:${store.phone.replace(/\s/g, "")}`} className="hover:text-ivory">{store.phone}</a></p>}
            {store.whatsapp && <p><a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-ivory">Chat on WhatsApp</a></p>}
          </div>
          <p className="md:text-center">{paymentsLive ? <>Secure payments by UPI, cards and net banking <span className="whitespace-nowrap">via Razorpay</span>.</> : "Prices in INR, inclusive of GST."}</p>
          <div className="flex flex-wrap gap-4 md:justify-end">
            {social.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer" className="capitalize hover:text-ivory">{k}</a>)}
            <span>© {new Date().getFullYear()} {store.name}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
