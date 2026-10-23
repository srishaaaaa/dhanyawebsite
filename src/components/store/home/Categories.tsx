import Link from "next/link";
import Img from "../Img";
import Tilt from "../Tilt";

type Cat = { id: string; name: string; slug: string; imageUrl: string | null; description: string | null };

/** Image tiles for every visible top-level category, plus an optional tile that opens all collections. */
export default function Categories({ title, intro, items, showCollections }: { title: string; intro?: string; items: Cat[]; showCollections: boolean }) {
  const tiles = [
    ...items.slice(0, 4).map((c) => ({ key: c.id, label: c.name, note: c.description, href: `/category/${c.slug}`, image: c.imageUrl })),
    ...(showCollections ? [{ key: "collections", label: "Collections", note: "Curated edits, season by season.", href: "/collections", image: items.find((c) => c.imageUrl)?.imageUrl ?? null }] : []),
  ].slice(0, 5);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="cats-h" className="container-x py-24 sm:py-32">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="kicker mb-6" data-reveal>Shop by category</p>
          <h2 id="cats-h" className="display text-[clamp(2.8rem,6vw,6.5rem)] text-aubergine" data-reveal>{title}</h2>
        </div>
        {intro && <p className="max-w-sm text-charcoal/65" data-reveal>{intro}</p>}
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:gap-7 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <li key={t.key} className={i === 0 ? "col-span-2 lg:row-span-2" : ""}>
            <Tilt max={4} className="h-full">
              <Link href={t.href} data-cursor="SHOP" className={`group frame relative block overflow-hidden bg-aubergine ${i === 0 ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[640px]" : "aspect-[3/4]"}`} data-reveal="mask">
                <Img src={t.image} alt="" sizes="(min-width:1024px) 20vw, 50vw" width={800}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.07]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-plum/90 via-plum/10 to-transparent transition-opacity duration-500 group-hover:from-plum" />
                <span data-lift className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5 text-ivory sm:p-7">
                  <span>
                    <span className="block text-[10px] tracking-[0.3em] text-gold">{String(i + 1).padStart(2, "0")}</span>
                    <span className="mt-2 block font-serif text-3xl font-light leading-none sm:text-4xl">{t.label}</span>
                  </span>
                  <span aria-hidden className="text-xl text-gold transition-transform duration-500 group-hover:translate-x-1.5">→</span>
                </span>
              </Link>
            </Tilt>
          </li>
        ))}
      </ul>
    </section>
  );
}
