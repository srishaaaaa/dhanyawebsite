import Link from "next/link";
import Img from "../Img";
import type { CollectionsContent } from "@/lib/homepage-schema";

type Col = { id: string; title: string; slug: string; description: string | null; imageUrl: string | null; ctaLabel: string | null; ctaHref: string | null };

// Asymmetric editorial rhythm: [desktop column span, aspect ratio, vertical offset]
const RHYTHM = [
  ["lg:col-span-7", "aspect-[4/5]", ""],
  ["lg:col-span-5", "aspect-[3/4]", "lg:mt-40"],
  ["lg:col-span-4", "aspect-[3/4]", ""],
  ["lg:col-span-8", "aspect-[16/10]", "lg:mt-10"],
  ["lg:col-span-6", "aspect-[4/5]", ""],
  ["lg:col-span-6", "aspect-[4/5]", "lg:mt-28"],
  ["lg:col-span-12", "aspect-[21/9]", ""],
] as const;

export default function Collections({ c, collections }: { c: CollectionsContent; collections: Col[] }) {
  const list = (c.collectionIds?.length ? c.collectionIds.map((id) => collections.find((x) => x.id === id)).filter(Boolean) as Col[] : collections).slice(0, 7);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="edits-h" className="container-x py-24 sm:py-32">
      <div className="grid gap-6 lg:grid-cols-12 mb-14">
        <h2 id="edits-h" className="display text-5xl sm:text-7xl lg:col-span-6" data-reveal>{c.title}</h2>
        {c.intro && <p className="lg:col-span-4 lg:col-start-9 self-end text-charcoal/70 leading-relaxed" data-reveal>{c.intro}</p>}
      </div>
      <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-12">
        {list.map((col, i) => {
          const [span, aspect, offset] = RHYTHM[i % RHYTHM.length];
          const href = col.ctaHref || `/collections/${col.slug}`;
          return (
            <div key={col.id} className={`${span} ${offset}`} data-depth={i % 2 ? "0.1" : "0.04"}>
            <Link href={href} data-cursor="EXPLORE" className="group depth-card block">
              <div className={`relative overflow-hidden bg-rose/50 ${aspect}`} data-reveal="mask">
                <Img src={col.imageUrl} alt={col.title} sizes="(min-width:1024px) 60vw, 100vw" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.05]" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-aubergine/45 via-transparent to-transparent opacity-80" />
              </div>
              <div className="mt-5 flex items-end justify-between gap-6">
                <div>
                  <span aria-hidden className="mb-2 block text-[11px] tracking-[0.3em] text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-serif text-3xl sm:text-4xl leading-none group-hover:text-burgundy transition-colors">{col.title}</h3>
                  {col.description && <p className="mt-2 max-w-sm text-sm text-charcoal/65">{col.description}</p>}
                </div>
                <span className="nav-link shrink-0 text-xs tracking-[0.2em]">{col.ctaLabel || "EXPLORE"}</span>
              </div>
            </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
