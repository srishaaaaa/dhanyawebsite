import { NewsletterForm } from "../Forms";
import SilkField from "../silk/SilkField";
import type { SimpleContent } from "@/lib/homepage-schema";

/** The closing room: living silk behind a single invitation. */
export default function Newsletter({ c }: { c: SimpleContent }) {
  return (
    <section aria-labelledby="nl-h" className="stage grain relative isolate overflow-hidden py-32 sm:py-44">
      <SilkField tone="plum" className="-z-10" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-plum/70 via-transparent to-plum/70" />
      <div className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <p className="kicker mb-8 justify-center" data-reveal>The private list</p>
          <h2 id="nl-h" className="display text-[clamp(3rem,7vw,7rem)]" data-reveal>{c.title}</h2>
          {c.intro && <p className="mx-auto mt-8 max-w-lg text-ivory/75" data-reveal>{c.intro}</p>}
          <div className="mt-12 flex justify-center text-left"><NewsletterForm dark /></div>
        </div>
      </div>
    </section>
  );
}
