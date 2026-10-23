import Link from "next/link";
import Img from "../Img";
import Tilt from "../Tilt";
import type { StoryContent } from "@/lib/homepage-schema";

/** Craft chapter: dark gallery wall, one large photograph in a gold mount, copy set against an oversized chapter numeral. */
export default function Story({ c }: { c: StoryContent }) {
  return (
    <section aria-labelledby="story-h" className="stage grain relative isolate overflow-hidden">
      {c.image && <Img src={c.image} alt="" sizes="100vw" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-plum via-plum/85 to-plum/40" />
      <p aria-hidden className="pointer-events-none absolute -top-10 right-4 select-none font-serif text-[clamp(10rem,32vw,34rem)] font-light leading-none text-ivory/[0.04]">II</p>
      <div className="container-x grid min-h-[100svh] items-center gap-16 py-28 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="kicker mb-8" data-reveal>The craft</p>
          <h2 id="story-h" className="display text-[clamp(3rem,6.5vw,6.5rem)]" data-reveal>{c.heading}</h2>
          <p className="mt-10 max-w-xl font-serif text-xl font-light leading-relaxed text-ivory/85 sm:text-2xl" data-reveal>{c.body}</p>
          {c.cta?.label && <Link href={c.cta.href} data-magnet className="btn-primary mt-12">{c.cta.label}<span aria-hidden>→</span></Link>}
        </div>
        {c.image && (
          <div className="lg:col-span-5 lg:col-start-8" data-depth="0.1">
            <Tilt max={5}>
              <div className="frame relative aspect-[4/5] overflow-hidden" data-reveal="mask-x">
                <Img src={c.image} alt={c.imageAlt ?? ""} sizes="(min-width:1024px) 40vw, 90vw" width={1000} className="h-full w-full object-cover" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-plum/40 to-transparent" />
              </div>
              <p data-lift className="mt-4 text-[10px] uppercase tracking-[0.4em] text-gold">Detail — plate II</p>
            </Tilt>
          </div>
        )}
      </div>
    </section>
  );
}
