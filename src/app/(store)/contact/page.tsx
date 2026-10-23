import type { Metadata } from "next";
import PageHero from "@/components/store/PageHero";
import { getPublishedPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";
import { ContactForm } from "@/components/store/Forms";

export const revalidate = 60;
export const metadata: Metadata = { title: "Contact us", alternates: { canonical: "/contact" } };

export default async function Contact() {
  const [page, { store }] = await Promise.all([getPublishedPage("contact"), getSettings()]);
  return (
    <>
    <PageHero kicker="We would love to hear from you" title={page?.title ?? "Contact us"} />
    <div className="container-x grid gap-16 py-20 pb-28 lg:grid-cols-2">
      <div>
        {page?.body.trim() ? <div className="prose-dhanya mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
          : <p className="max-w-md text-charcoal/70">Questions about sizing, an order, or styling for an occasion? Write to us and we&apos;ll reply within one working day.</p>}
        <dl className="mt-10 space-y-4 text-sm">
          {store.email && <div><dt className="text-charcoal/55">Email</dt><dd><a href={`mailto:${store.email}`} className="underline">{store.email}</a></dd></div>}
          {store.phone && <div><dt className="text-charcoal/55">Phone</dt><dd><a href={`tel:${store.phone.replace(/\s/g, "")}`}>{store.phone}</a></dd></div>}
          {store.whatsapp && <div><dt className="text-charcoal/55">WhatsApp</dt><dd><a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="underline">Chat with us</a></dd></div>}
          {store.address && <div><dt className="text-charcoal/55">Visit</dt><dd className="whitespace-pre-line">{store.address}</dd></div>}
        </dl>
      </div>
      <div><ContactForm /></div>
    </div>
    </>
  );
}
