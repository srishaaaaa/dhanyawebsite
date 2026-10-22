import Link from "next/link";
import Img from "../Img";
import type { CampaignContent } from "@/lib/homepage-schema";

export default function Campaign({ c }: { c: CampaignContent }) {
  const dark = c.tone !== "light";
  return (
    <section aria-label={c.heading} className={`${dark ? "bg-burgundy text-ivory" : "bg-rose/50 text-charcoal"}`} style={c.bg ? { backgroundColor: c.bg } : undefined}>
      <div className={`grid min-h-[90vh] lg:grid-cols-2 ${c.imageSide === "right" ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div className="relative min-h-[60vh] overflow-hidden" data-reveal="mask">
          <Img src={c.image} alt={c.imageAlt ?? c.heading} sizes="(min-width:1024px) 50vw, 100vw" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="flex flex-col justify-center px-6 py-20 sm:px-16 lg:px-20">
          {c.kicker && <p className={`mb-6 text-sm ${dark ? "text-gold" : "text-burgundy"}`}>{c.kicker}</p>}
          <h2 className="display text-[clamp(3rem,7vw,6.5rem)]" data-reveal>{c.heading}</h2>
          <p className={`mt-8 max-w-md leading-relaxed ${dark ? "text-ivory/80" : "text-charcoal/75"}`} data-reveal>{c.body}</p>
          {c.cta?.label && <Link href={c.cta.href} className={`mt-10 self-start ${dark ? "btn-ghost-light" : "btn-outline"}`}>{c.cta.label}</Link>}
        </div>
      </div>
    </section>
  );
}
