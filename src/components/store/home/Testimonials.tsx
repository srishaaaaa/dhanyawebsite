import Link from "next/link";
import Stars from "../Stars";

type R = { id: string; rating: number; title: string | null; body: string | null; productName: string; productSlug: string; verified: boolean; author: string };

/** Only real, approved, featured reviews are shown. The section hides itself when there are none. */
export default function Testimonials({ title, reviews }: { title: string; reviews: R[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="t-h" className="bg-rose/40 py-24 sm:py-32">
      <div className="container-x">
        <h2 id="t-h" className="display text-5xl sm:text-6xl mb-14" data-reveal>{title}</h2>
        <ul className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <figure>
                <Stars value={r.rating} />
                <blockquote className="mt-4 font-serif text-2xl leading-snug">{r.title ? `${r.title}. ` : ""}{r.body}</blockquote>
                <figcaption className="mt-5 text-sm text-charcoal/60">
                  {r.author}{r.verified ? ", verified buyer" : ""} — <Link href={`/products/${r.productSlug}`} className="underline underline-offset-4">{r.productName}</Link>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
