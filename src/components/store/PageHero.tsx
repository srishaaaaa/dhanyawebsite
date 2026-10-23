import Link from "next/link";
import SilkField from "./silk/SilkField";

/** Dark, silk-lit title room used at the top of every secondary page so the whole store shares one visual world. */
export default function PageHero({ kicker, title, intro, crumbs, compact = false }: { kicker?: string; title: string; intro?: string; crumbs?: { label: string; href?: string }[]; compact?: boolean }) {
  return (
    <header className="stage grain relative isolate overflow-hidden">
      <SilkField tone="plum" className="-z-10 opacity-90" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-plum/80 via-plum/10 to-plum/40" />
      <div className={`container-x ${compact ? "pb-12 pt-10 sm:pb-16 sm:pt-14" : "pb-16 pt-14 sm:pb-24 sm:pt-20"}`}>
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-8 text-[11px] uppercase tracking-[0.24em] text-ivory/55">
            <ol className="flex flex-wrap gap-3">
              {crumbs.map((c, i) => <li key={i} className="flex gap-3">{i > 0 && <span aria-hidden className="text-gold">/</span>}{c.href ? <Link href={c.href} className="hover:text-gold">{c.label}</Link> : <span aria-current="page" className="text-ivory">{c.label}</span>}</li>)}
            </ol>
          </nav>
        )}
        {kicker && <p className="kicker mb-6">{kicker}</p>}
        <h1 className={`display hero-fade ${compact ? "text-[clamp(2.8rem,7vw,6.5rem)]" : "text-[clamp(3.5rem,9vw,9rem)]"}`}>{title}</h1>
        {intro && <p className="hero-fade mt-6 max-w-xl text-lg leading-relaxed text-ivory/75" style={{ animationDelay: ".2s" }}>{intro}</p>}
      </div>
    </header>
  );
}
