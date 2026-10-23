import Link from "next/link";
import { listProducts, type ListFilters } from "@/lib/catalog/queries";
import ProductCard from "./ProductCard";
import Filters from "./Filters";
import SilkField from "./silk/SilkField";

export type SP = { [k: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const many = (v: string | string[] | undefined) => (v ? (Array.isArray(v) ? v : v.split(",")).map((x) => x.trim()).filter(Boolean).slice(0, 20) : []);
const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export function parseFilters(sp: SP): ListFilters & { view: "grid" | "list" } {
  return {
    q: one(sp.q)?.slice(0, 80), sizes: many(sp.size), colors: many(sp.color), min: num(one(sp.min)), max: num(one(sp.max)),
    inStock: one(sp.stock) === "1", sort: one(sp.sort), page: num(one(sp.page)) ?? 1, view: one(sp.view) === "list" ? "list" : "grid",
  };
}

/** Product listing with filters, sorting, count and accessible pagination. */
export default async function Listing({ base, sp, scope, emptyTitle = "Nothing matches these filters" }: {
  base: string; sp: SP; scope: Pick<ListFilters, "category" | "collection" | "tag">; emptyTitle?: string;
}) {
  const f = parseFilters(sp);
  const res = await listProducts({ ...f, ...scope });
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== "page" && typeof v === "string" && v) params.set(k, v);
  const pageHref = (p: number) => { const x = new URLSearchParams(params); if (p > 1) x.set("page", String(p)); const s = x.toString(); return s ? `${base}?${s}` : base; };
  const filtered = Boolean(f.sizes?.length || f.colors?.length || f.min !== undefined || f.max !== undefined || f.inStock);

  return (
    <div className="container-x pb-24">
      <Filters facets={res.facets} total={res.total} />
      {res.items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif text-5xl font-light text-aubergine">{f.q ? `Nothing found for “${f.q}”` : filtered ? emptyTitle : "New pieces are on their way"}</p>
          <p className="mt-3 text-charcoal/60">{filtered ? "Try removing a filter or widening the price range." : f.q ? "Check the spelling, or try a fabric, colour or occasion." : "This edit is being curated — explore the rest of the boutique in the meantime."}</p>
          <div className="mt-8 flex justify-center gap-3">
            {filtered && <Link href={base + (f.q ? `?q=${encodeURIComponent(f.q)}` : "")} className="btn-outline">Clear filters</Link>}
            <Link href="/shop" className="btn-primary">Shop all</Link>
          </div>
        </div>
      ) : (
        <>
          <ul data-stagger className={f.view === "list" ? "space-y-10" : "grid grid-cols-2 gap-x-5 gap-y-16 sm:gap-x-8 lg:grid-cols-3 xl:grid-cols-4"}>
            {res.items.map((p, i) => <li key={p.id}><ProductCard p={p} priority={i < 4} layout={f.view} /></li>)}
          </ul>
          {res.pages > 1 && (
            <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2 text-sm">
              {res.page > 1 && <Link href={pageHref(res.page - 1)} rel="prev" className="btn-outline px-4 py-2">Previous</Link>}
              {Array.from({ length: res.pages }, (_, i) => i + 1).filter((p) => Math.abs(p - res.page) <= 2 || p === 1 || p === res.pages).map((p, i, arr) => (
                <span key={p} className="flex items-center gap-2">
                  {i > 0 && arr[i - 1] !== p - 1 && <span aria-hidden>…</span>}
                  <Link href={pageHref(p)} aria-current={p === res.page ? "page" : undefined}
                    className={`grid h-11 w-11 place-items-center border transition-colors ${p === res.page ? "border-aubergine bg-aubergine text-ivory" : "border-transparent hover:border-gold"}`}>{p}</Link>
                </span>
              ))}
              {res.page < res.pages && <Link href={pageHref(res.page + 1)} rel="next" className="btn-outline px-4 py-2">Next</Link>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export function ListingHeader({ title, intro, crumbs }: { title: string; intro?: string | null; crumbs: { label: string; href?: string }[] }) {
  return (
    <header className="stage grain relative isolate mb-14 overflow-hidden">
      <SilkField tone="plum" className="-z-10 opacity-90" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-plum/80 via-plum/10 to-plum/40" />
      <div className="container-x pb-16 pt-14 sm:pb-24 sm:pt-20">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.24em] text-ivory/55">
          <ol className="flex flex-wrap gap-3">
            {crumbs.map((c, i) => (
              <li key={i} className="flex gap-3">{i > 0 && <span aria-hidden className="text-gold">/</span>}{c.href ? <Link href={c.href} className="hover:text-gold">{c.label}</Link> : <span aria-current="page" className="text-ivory">{c.label}</span>}</li>
            ))}
          </ol>
        </nav>
        <h1 className="display hero-fade mt-10 text-[clamp(3.5rem,10vw,10rem)]">{title}</h1>
        {intro && <p className="hero-fade mt-6 max-w-xl text-lg leading-relaxed text-ivory/75" style={{ animationDelay: ".2s" }}>{intro}</p>}
      </div>
    </header>
  );
}
