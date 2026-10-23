import Link from "next/link";
import Img from "../Img";
import SilkField from "../silk/SilkField";
import type { CampaignContent } from "@/lib/homepage-schema";

/** Full-bleed campaign: the photograph and a pane of living silk share the frame; the type overlaps both. */
export default function Campaign({ c }: { c: CampaignContent }) {
  const dark = c.tone !== "light";
  return (
    <section aria-label={c.heading} className={`relative isolate overflow-hidden ${dark ? "stage text-ivory" : "bg-rose/50 text-charcoal"}`} style={c.bg ? { backgroundColor: c.bg } : undefined}>
      {!dark && <SilkField tone="ivory" className="-z-10 opacity-80" />}
      <div className={`grid min-h-[100svh] lg:grid-cols-[1.1fr_0.9fr] ${c.imageSide === "right" ? "lg:[&>*:first-child]:order-2 lg:grid-cols-[0.9fr_1.1fr]" : ""}`}>
        <div className="relative min-h-[70vh] overflow-hidden" data-reveal="mask">
          <Img src={c.image} alt={c.imageAlt ?? c.heading} sizes="(min-width:1024px) 55vw, 100vw" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className={`absolute inset-0 ${dark ? "bg-gradient-to-t from-plum/55 via-transparent to-plum/20" : "bg-gradient-to-t from-plum/25 to-transparent"}`} />
        </div>
        <div className="relative flex flex-col justify-center px-6 py-24 sm:px-16 lg:px-20">
          {dark && <div aria-hidden className="absolute inset-0 -z-10 opacity-60"><SilkField tone="plum" /></div>}
          {c.kicker && <p className={`kicker mb-8 ${dark ? "" : "!text-burgundy"}`}>{c.kicker}</p>}
          <h2 className={`display text-[clamp(3.2rem,8vw,8.5rem)] ${dark && c.imageSide !== "right" ? "lg:-ml-[18%] lg:[text-shadow:0_6px_40px_rgb(0_0_0/.35)]" : ""}`} data-reveal>{c.heading}</h2>
          <p className={`mt-10 max-w-md leading-relaxed ${dark ? "text-ivory/80" : "text-charcoal/75"}`} data-reveal>{c.body}</p>
          {c.cta?.label && <Link href={c.cta.href} data-magnet className={`mt-12 self-start ${dark ? "btn-primary" : "btn-outline"}`}>{c.cta.label}<span aria-hidden>→</span></Link>}
        </div>
      </div>
    </section>
  );
}
