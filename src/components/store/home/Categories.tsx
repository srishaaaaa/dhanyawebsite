import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Img from "../Img";

type Cat = { id: string; name: string; slug: string; imageUrl: string | null; description: string | null };

/** Image tiles for every visible top-level category, plus an optional tile that opens all collections. */
export default function Categories({ title, intro, items, showCollections }: { title: string; intro?: string; items: Cat[]; showCollections: boolean }) {
  const tiles = [
    ...items.slice(0, 4).map((c) => ({ key: c.id, label: c.name, note: c.description, href: `/category/${c.slug}`, image: c.imageUrl })),
    ...(showCollections ? [{ key: "collections", label: "Collections", note: "Curated edits, season by season.", href: "/collections", image: items.find((c) => c.imageUrl)?.imageUrl ?? null }] : []),
  ].slice(0, 5);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="cats-h" className="container-x py-20 sm:py-28">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h2 id="cats-h" className="display text-5xl sm:text-6xl" data-reveal>{title}</h2>
        {intro && <p className="max-w-sm text-charcoal/65" data-reveal>{intro}</p>}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <li key={t.key} className={i === 0 ? "col-span-2 lg:row-span-2" : ""}>
            <Link href={t.href} className={`group relative block overflow-hidden bg-aubergine ${i === 0 ? "aspect-[4/5] lg:aspect-auto lg:h-full" : "aspect-[3/4]"}`} data-reveal="mask">
              <Img src={t.image} alt="" sizes="(min-width:1024px) 20vw, 50vw" width={800}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.06]" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-aubergine/85 via-aubergine/10 to-transparent transition-opacity duration-500 group-hover:from-aubergine/95" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-ivory sm:p-5">
                <span>
                  <span className="block font-serif text-2xl leading-none sm:text-3xl">{t.label}</span>
                  <span className="mt-2 block text-[11px] tracking-[0.22em] text-gold">SHOP NOW</span>
                </span>
                <ArrowUpRight size={20} strokeWidth={1.3} className="shrink-0 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
