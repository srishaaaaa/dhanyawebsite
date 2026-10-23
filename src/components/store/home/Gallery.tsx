import Link from "next/link";
import Img from "../Img";

/**
 * Visual gallery built from the boutique's own product photography. It is not a live Instagram feed;
 * the "Follow" link appears only when an Instagram URL is configured in Admin → Store settings.
 */
export default function Gallery({ images, instagram }: { images: { url: string; href: string; alt: string }[]; instagram?: string }) {
  if (images.length < 4) return null;
  const tiles = images.slice(0, 6);
  return (
    <section aria-labelledby="gal-h" className="bg-ivory py-24 sm:py-32">
      <div className="container-x">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="kicker mb-5" data-reveal>In pictures</p>
            <h2 id="gal-h" className="display text-[clamp(2.4rem,5vw,5rem)] text-aubergine" data-reveal>The look <span className="editorial-italic text-gold">book</span></h2>
          </div>
          {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="btn-outline">Follow on Instagram<span aria-hidden>↗</span></a>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-stagger>
          {tiles.map((t, i) => (
            <Link key={t.url + i} href={t.href} className={`group relative block overflow-hidden ${i % 3 === 1 ? "lg:mt-10" : ""}`}>
              <Img src={t.url} alt={t.alt} sizes="(min-width:1024px) 16vw, 45vw" width={600} className="aspect-[4/5] w-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110" />
              <span className="absolute inset-0 flex items-end bg-gradient-to-t from-plum/70 via-transparent to-transparent p-3 text-[11px] uppercase tracking-[0.2em] text-ivory opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">{t.alt}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
