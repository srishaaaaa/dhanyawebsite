import Link from "next/link";
import Stars from "../Stars";

type R = { id: string; rating: number; title: string | null; body: string | null; productName: string; productSlug: string; verified: boolean; author: string };

/** Only real, approved, featured reviews are shown. The section hides itself when there are none. */
export default function Testimonials({ title, reviews }: { title: string; reviews: R[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="t-h" className="relative overflow-hidden bg-rose/40 py-28 sm:py-40">
      <p aria-hidden className="pointer-events-none absolute -left-4 -top-16 select-none font-serif text-[clamp(14rem,34vw,36rem)] font-light leading-none text-aubergine/[0.06]">&ldquo;</p>
      <div className="container-x relative">
        <p className="kicker mb-6" data-reveal>In their words</p>
        <h2 id="t-h" className="display mb-20 text-[clamp(2.8rem,6vw,6rem)] text-aubergine" data-reveal>{title}</h2>
        <ul className="grid gap-x-14 gap-y-16 md:grid-cols-2 lg:grid-cols-3" data-stagger>
          {reviews.map((r) => (
            <li key={r.id} className="border-t border-gold/60 pt-8">
              <figure>
                <Stars value={r.rating} />
                <blockquote className="mt-6 font-serif text-[1.65rem] font-light leading-snug">{r.title ? `${r.title}. ` : ""}{r.body}</blockquote>
                <figcaption className="mt-7 text-sm text-charcoal/60">
                  {r.author}{r.verified ? ", verified buyer" : ""} — <Link href={`/products/${r.productSlug}`} className="underline underline-offset-4 hover:text-burgundy">{r.productName}</Link>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
