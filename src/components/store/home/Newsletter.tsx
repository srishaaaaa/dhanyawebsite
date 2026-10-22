import { NewsletterForm } from "../Forms";
import type { SimpleContent } from "@/lib/homepage-schema";

export default function Newsletter({ c }: { c: SimpleContent }) {
  return (
    <section aria-labelledby="nl-h" className="container-x py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="nl-h" className="display text-5xl sm:text-6xl" data-reveal>{c.title}</h2>
        {c.intro && <p className="mt-5 text-charcoal/70">{c.intro}</p>}
        <div className="mt-10 flex justify-center text-left"><NewsletterForm dark={false} /></div>
      </div>
    </section>
  );
}
