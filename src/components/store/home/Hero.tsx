import Link from "next/link";
import dynamic from "next/dynamic";
import Img from "../Img";
import Tilt from "../Tilt";
import { Monogram } from "../Wordmark";
import SilkCurtain from "../SilkCurtain";
import type { HeroContent } from "@/lib/homepage-schema";

const CoutureStage = dynamic(() => import("../stage/CoutureStage"));

/** A jharokha arch with a gold hairline; falls back to a monogram until artwork is set. */
function Arch({ src, alt, mobileSrc, accent, sizes, priority, className = "" }: { src?: string; alt: string; mobileSrc?: string; accent?: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-t-[999px] border border-gold/60 p-2.5 ${className}`} style={accent ? { borderColor: `${accent}99` } : undefined}>
      <div className="relative h-full w-full overflow-hidden rounded-t-[999px] bg-gradient-to-b from-burgundy to-aubergine">
        {src ? (
          <picture>
            {mobileSrc && <source media="(max-width: 640px)" srcSet={mobileSrc} />}
            <Img src={src} alt={alt} priority={priority} sizes={sizes} className="hero-img h-full w-full object-cover" />
          </picture>
        ) : <div className="flex h-full items-center justify-center"><Monogram className="h-24 w-24 text-gold/70" /></div>}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-plum/50 via-transparent to-transparent" />
      </div>
    </div>
  );
}

export default function Hero({ c, portals = [] }: { c: HeroContent; portals?: { slug: string; title: string }[] }) {
  // Split the headline at a comma (or mid-way) so it sets as two deliberate lines.
  const parts = c.heading.includes(",") ? [c.heading.slice(0, c.heading.indexOf(",") + 1), c.heading.slice(c.heading.indexOf(",") + 1).trim()] : [c.heading];
  return (
    <section aria-label="Introduction" data-hero className="stage grain relative isolate overflow-hidden text-ivory lg:min-h-[100svh]" style={c.bg ? { backgroundColor: c.bg } : undefined}>
      {c.scene !== "none" && <CoutureStage image={c.image} accent={c.accent || undefined} portals={portals} />}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-plum to-transparent" />

      {/* Gallery furniture: vertical running title and edition marks */}
      <p aria-hidden className="vertical-text absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 text-[10px] uppercase tracking-[0.5em] text-ivory/40 xl:block">Dhanya Boutique — The Silk Universe</p>
      <p aria-hidden className="absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 text-[10px] uppercase tracking-[0.5em] text-ivory/40 [writing-mode:vertical-rl] xl:block">Edition {new Date().getFullYear()}</p>

      <div className="container-x grid items-center gap-14 pb-24 pt-36 sm:pt-40 lg:min-h-[100svh] lg:grid-cols-[1.15fr_0.85fr] lg:gap-6 lg:pb-28">
        <div className="pointer-events-none relative z-10 [&_a]:pointer-events-auto" data-hero-copy data-depth-copy>
          <p className="hero-fade kicker mb-8" style={{ animationDelay: ".1s" }}>The new season edit</p>
          <h1 className="display text-[clamp(2.6rem,5.2vw,6.2rem)]">
            {parts.map((p, i) => <span key={i} className={`hero-line ${i > 0 ? "editorial-italic" : ""}`}><span className={i > 0 ? "metal-text" : ""} style={{ animationDelay: `${0.25 + i * 0.18}s` }}>{p}</span></span>)}
          </h1>
          <p className="hero-fade mt-9 max-w-lg text-base leading-relaxed text-ivory/75 sm:text-lg" style={{ animationDelay: ".75s" }}>{c.subheading}</p>
          <div className="hero-fade mt-11 flex flex-col gap-4 sm:flex-row sm:flex-wrap" style={{ animationDelay: ".95s" }}>
            <Link href={c.primaryCta.href} data-magnet className="btn-primary">{c.primaryCta.label}<span aria-hidden>→</span></Link>
            {c.secondaryCta?.label && <Link href={c.secondaryCta.href} data-magnet className="btn-ghost-light">{c.secondaryCta.label}</Link>}
          </div>
        </div>

        {/* Campaign composition: a large arch with a smaller overlapping frame, both lifting toward the cursor */}
        <div className="hero-fade hero-visual relative mx-auto w-full max-w-[540px] pb-10 lg:max-w-none lg:pb-0" style={{ animationDelay: ".4s" }}>
          <Tilt max={5}>
            {c.video ? (
              <div className="relative mx-auto aspect-[3/4] w-[78%] overflow-hidden rounded-t-[999px] border border-gold/60 p-2.5 lg:ml-auto lg:mr-6 lg:w-[72%]">
                <video src={c.video} poster={c.image} autoPlay muted loop playsInline className="h-full w-full rounded-t-[999px] object-cover" aria-label={c.imageAlt ?? "Campaign film"} />
              </div>
            ) : (
              <Arch src={c.image} mobileSrc={c.mobileImage} alt={c.imageAlt ?? "DHANYA BOUTIQUE campaign"} accent={c.accent || undefined} priority
                sizes="(min-width:1024px) 40vw, 80vw" className="mx-auto aspect-[3/4] w-[78%] lg:ml-auto lg:mr-6 lg:w-[72%]" />
            )}
            {c.image2 && (
              <div data-lift className="absolute -bottom-2 left-0 w-[40%] lg:bottom-10 lg:left-2 lg:w-[38%]">
                <div className="rounded-t-[999px] border border-gold/50 bg-plum p-1.5 shadow-[0_40px_70px_-20px_rgba(0,0,0,.75)]">
                  <Img src={c.image2} alt="" sizes="(min-width:1024px) 18vw, 32vw" width={640} className="aspect-[3/4] w-full rounded-t-[999px] object-cover" />
                </div>
              </div>
            )}
            <span aria-hidden data-lift className="absolute -right-2 top-[12%] hidden h-24 w-24 items-center justify-center rounded-full border border-gold/60 bg-plum/70 text-center font-serif text-[11px] leading-tight tracking-[0.2em] text-gold backdrop-blur lg:flex">SILK<br />ZARI<br />CRAFT</span>
          </Tilt>
        </div>
      </div>
      <a href="#after-hero" className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-ivory/60 hover:text-ivory lg:hidden">Scroll<span aria-hidden className="block h-8 w-px bg-gold/70" /></a>
      <SilkCurtain />
    </section>
  );
}
