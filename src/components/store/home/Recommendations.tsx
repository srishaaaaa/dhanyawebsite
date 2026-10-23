import Link from "next/link";
import ProductCard, { type Card } from "../ProductCard";

/** Editor's picks: one large lead piece beside a staggered pair — deliberately not another row of equal cards. */
export default function Recommendations({ title = "Curated for you", products }: { title?: string; products: Card[] }) {
  if (products.length < 3) return null;
  const [lead, ...rest] = products;
  return (
    <section aria-labelledby="rec-h" className="bg-rose/25 py-24 sm:py-32">
      <div className="container-x">
        <p className="kicker mb-6" data-reveal>Editor&apos;s picks</p>
        <h2 id="rec-h" className="display mb-14 text-[clamp(2.6rem,5.5vw,5.5rem)] text-aubergine" data-reveal>{title}</h2>
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6"><ProductCard p={lead} sizes="(min-width:1024px) 45vw, 100vw" /></div>
          <div className="grid grid-cols-2 gap-6 lg:col-span-6 lg:pt-24">
            {rest.slice(0, 2).map((p, i) => <div key={p.id} className={i === 1 ? "mt-12" : ""}><ProductCard p={p} sizes="(min-width:1024px) 22vw, 50vw" /></div>)}
          </div>
        </div>
        <div className="mt-14 text-center"><Link href="/shop" className="btn-outline">Browse everything</Link></div>
      </div>
    </section>
  );
}
