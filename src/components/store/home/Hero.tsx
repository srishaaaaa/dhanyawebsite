import Link from "next/link";
import dynamic from "next/dynamic";
import Img from "../Img";
import { Monogram } from "../Wordmark";
import SilkCurtain from "../SilkCurtain";
import type { HeroContent } from "@/lib/homepage-schema";

const CoutureStage = dynamic(() => import("../stage/CoutureStage"));

/** An arched frame (jharokha window) with a gold hairline; falls back to a monogram until artwork is set. */
function Arch({ src, alt, mobileSrc, accent, sizes, priority, className = "" }: { src?: string; alt: string; mobileSrc?: string; accent?: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-t-[999px] border border-gold/50 p-2 ${className}`} style={accent ? { borderColor: `${accent}80` } : undefined}>
      <div className="relative h-full w-full overflow-hidden rounded-t-[999px] bg-gradient-to-b from-burgundy to-aubergine">
        {src ? (
          <picture>
            {mobileSrc && <source media="(max-width: 640px)" srcSet={mobileSrc} />}
            <Img src={src} alt={alt} priority={priority} sizes={sizes} className="hero-img h-full w-full object-cover" />
          </picture>
        ) : <div className="flex h-full items-center justify-center"><Monogram className="h-24 w-24 text-gold/70" /></div>}
      </div>
    </div>
  );
}

export default function Hero({ c, portals = [] }: { c: HeroContent; portals?: { slug: string; title: string }[] }) {
  // Split the headline at a comma (or mid-way) so it sets as two deliberate lines.
  const parts = c.heading.includes(",") ? [c.heading.slice(0, c.heading.indexOf(",") + 1), c.heading.slice(c.heading.indexOf(",") + 1).trim()] : [c.heading];
  return (
    <section aria-label="Introduction" data-hero className="relative isolate overflow-hidden bg-aubergine text-ivory lg:min-h-[100svh]" style={c.bg ? { backgroundColor: c.bg } : undefined}>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_35%,rgb(var(--c-burgundy))_0%,transparent_62%)]" />
      {c.scene !== "none" && <CoutureStage image={c.image} accent={c.accent || undefined} portals={portals} />}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-aubergine to-transparent" />

      <div className="container-x grid items-center gap-14 pb-20 pt-32 sm:pt-36 lg:min-h-[100svh] lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-24">
        <div className="pointer-events-none relative z-10 [&_a]:pointer-events-auto" data-hero-copy data-depth-copy>
          <p className="hero-fade mb-6 flex items-center gap-4 text-[11px] tracking-[0.34em] text-gold" style={{ animationDelay: ".1s" }}>
            <span aria-hidden className="h-px w-10 bg-gold/70" />THE NEW SEASON EDIT
          </p>
          <h1 className="display text-[clamp(2.5rem,4.7vw,5.2rem)]">
            {parts.map((p, i) => <span key={i} className={`hero-line ${i > 0 ? "editorial-italic text-gold" : ""}`}><span style={{ animationDelay: `${0.25 + i * 0.18}s` }}>{p}</span></span>)}
          </h1>
          <p className="hero-fade mt-7 max-w-lg text-base leading-relaxed text-ivory/80 sm:text-lg" style={{ animationDelay: ".75s" }}>{c.subheading}</p>
          <div className="hero-fade mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4" style={{ animationDelay: ".95s" }}>
            <Link href={c.primaryCta.href} data-magnet className="btn-primary bg-gold text-aubergine hover:bg-ivory hover:text-aubergine">{c.primaryCta.label}</Link>
            {c.secondaryCta?.label && <Link href={c.secondaryCta.href} className="btn-ghost-light">{c.secondaryCta.label}</Link>}
          </div>
        </div>

        {/* Campaign composition: a large arch with a smaller overlapping frame */}
        <div className="hero-fade hero-visual relative mx-auto w-full max-w-[520px] pb-10 lg:max-w-none lg:pb-0" style={{ animationDelay: ".4s" }}>
          {c.video ? (
            <div className="relative mx-auto aspect-[3/4] w-[78%] overflow-hidden rounded-t-[999px] border border-gold/50 p-2 lg:ml-auto lg:mr-6 lg:w-[72%]">
              <video src={c.video} poster={c.image} autoPlay muted loop playsInline className="h-full w-full rounded-t-[999px] object-cover" aria-label={c.imageAlt ?? "Campaign film"} />
            </div>
          ) : (
            <Arch src={c.image} mobileSrc={c.mobileImage} alt={c.imageAlt ?? "DHANYA BOUTIQUE campaign"} accent={c.accent || undefined} priority
              sizes="(min-width:1024px) 40vw, 80vw" className="mx-auto aspect-[3/4] w-[78%] lg:ml-auto lg:mr-6 lg:w-[72%]" />
          )}
          {c.image2 && (
            <div className="absolute -bottom-2 left-0 w-[40%] lg:bottom-10 lg:left-2 lg:w-[38%]">
              <div className="rounded-t-[999px] border border-gold/40 bg-aubergine p-1.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]">
                <Img src={c.image2} alt="" sizes="(min-width:1024px) 18vw, 32vw" width={640} className="aspect-[3/4] w-full rounded-t-[999px] object-cover" />
              </div>
            </div>
          )}
          <span aria-hidden className="absolute -right-2 top-[12%] hidden h-24 w-24 items-center justify-center rounded-full border border-gold/50 bg-aubergine/70 text-center font-serif text-[11px] leading-tight tracking-[0.2em] text-gold backdrop-blur lg:flex">SILK<br />ZARI<br />CRAFT</span>
        </div>
      </div>
      <a href="#after-hero" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.3em] text-ivory/60 hover:text-ivory lg:hidden">SCROLL</a>
      <SilkCurtain />
    </section>
  );
}
