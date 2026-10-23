import Link from "next/link";
import Img from "../Img";
import Tilt from "../Tilt";
import type { CollectionsContent } from "@/lib/homepage-schema";

type Col = { id: string; title: string; slug: string; description: string | null; imageUrl: string | null; ctaLabel: string | null; ctaHref: string | null };

// Asymmetric exhibition rhythm: [desktop column span, aspect ratio, vertical offset]
const RHYTHM = [
  ["lg:col-span-7", "aspect-[4/5]", ""],
  ["lg:col-span-5", "aspect-[3/4]", "lg:mt-44"],
  ["lg:col-span-4", "aspect-[3/4]", ""],
  ["lg:col-span-8", "aspect-[16/10]", "lg:mt-12"],
  ["lg:col-span-6", "aspect-[4/5]", ""],
  ["lg:col-span-6", "aspect-[4/5]", "lg:mt-32"],
  ["lg:col-span-12", "aspect-[21/9]", ""],
] as const;

/** The collections gallery: framed panels hang at different depths and turn toward the visitor's cursor. */
export default function Collections({ c, collections }: { c: CollectionsContent; collections: Col[] }) {
  const list = (c.collectionIds?.length ? c.collectionIds.map((id) => collections.find((x) => x.id === id)).filter(Boolean) as Col[] : collections).slice(0, 7);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="edits-h" className="container-x py-28 sm:py-40">
      <div className="mb-20 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="kicker mb-6" data-reveal>The collections</p>
          <h2 id="edits-h" className="display text-[clamp(3rem,7.5vw,8rem)] text-aubergine" data-reveal>{c.title}</h2>
        </div>
        {c.intro && <p className="self-end leading-relaxed text-charcoal/70 lg:col-span-4 lg:col-start-9" data-reveal>{c.intro}</p>}
      </div>
      <div className="corridor grid gap-x-10 gap-y-20 sm:grid-cols-2 lg:grid-cols-12">
        {list.map((col, i) => {
          const [span, aspect, offset] = RHYTHM[i % RHYTHM.length];
          const href = col.ctaHref || `/collections/${col.slug}`;
          const side = i % 2 ? "right" : "left";
          return (
            <div key={col.id} className={`${span} ${offset}`} data-depth={i % 2 ? "0.1" : "0.04"}>
              <div className={`corridor-panel ${side}`}>
                <Tilt max={4}>
                  <Link href={href} data-cursor="EXPLORE" className="group block">
                    <div className={`frame relative overflow-hidden bg-rose/50 ${aspect}`} data-reveal="mask">
                      <Img src={col.imageUrl} alt={col.title} sizes="(min-width:1024px) 60vw, 100vw" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.06]" />
                      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-plum/60 via-transparent to-transparent opacity-80" />
                      <span aria-hidden className="absolute right-5 top-4 font-serif text-6xl font-light leading-none text-ivory/80 sm:text-7xl">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div data-lift className="mt-6 flex items-end justify-between gap-6">
                      <div>
                        <h3 className="font-serif text-4xl font-light leading-none transition-colors group-hover:text-burgundy sm:text-5xl">{col.title}</h3>
                        {col.description && <p className="mt-3 max-w-sm text-sm leading-relaxed text-charcoal/65">{col.description}</p>}
                      </div>
                      <span className="nav-link shrink-0 text-[11px] uppercase tracking-[0.26em]">{col.ctaLabel || "Explore"} →</span>
                    </div>
                  </Link>
                </Tilt>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
