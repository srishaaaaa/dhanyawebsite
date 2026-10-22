import Link from "next/link";
import Img from "../Img";
import type { StoryContent } from "@/lib/homepage-schema";

export default function Story({ c }: { c: StoryContent }) {
  return (
    <section aria-labelledby="story-h" className="relative isolate overflow-hidden bg-aubergine text-ivory">
      {c.image && <Img src={c.image} alt={c.imageAlt ?? ""} sizes="100vw" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-aubergine via-aubergine/80 to-transparent" />
      <div className="container-x grid min-h-[85vh] items-center py-28">
        <div className="max-w-2xl">
          <h2 id="story-h" className="display text-[clamp(2.8rem,6vw,5.5rem)]" data-reveal>{c.heading}</h2>
          <p className="mt-8 font-serif text-xl sm:text-2xl leading-relaxed text-ivory/85" data-reveal>{c.body}</p>
          {c.cta?.label && <Link href={c.cta.href} className="btn-ghost-light mt-10">{c.cta.label}</Link>}
        </div>
      </div>
    </section>
  );
}
