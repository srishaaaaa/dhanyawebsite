import Link from "next/link";
import { listProducts, type ListFilters } from "@/lib/catalog/queries";
import ProductCard from "./ProductCard";
import Filters from "./Filters";

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
          <p className="font-serif text-3xl">{f.q ? `Nothing found for “${f.q}”` : filtered ? emptyTitle : "New pieces are on their way"}</p>
          <p className="mt-3 text-charcoal/60">{filtered ? "Try removing a filter or widening the price range." : f.q ? "Check the spelling, or try a fabric, colour or occasion." : "This edit is being curated — explore the rest of the boutique in the meantime."}</p>
          <div className="mt-8 flex justify-center gap-3">
            {filtered && <Link href={base + (f.q ? `?q=${encodeURIComponent(f.q)}` : "")} className="btn-outline">Clear filters</Link>}
            <Link href="/shop" className="btn-primary">Shop all</Link>
          </div>
        </div>
      ) : (
        <>
          <ul className={f.view === "list" ? "space-y-8" : "grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4"}>
            {res.items.map((p, i) => <li key={p.id}><ProductCard p={p} priority={i < 4} layout={f.view} /></li>)}
          </ul>
          {res.pages > 1 && (
            <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2 text-sm">
              {res.page > 1 && <Link href={pageHref(res.page - 1)} rel="prev" className="btn-outline px-4 py-2">Previous</Link>}
              {Array.from({ length: res.pages }, (_, i) => i + 1).filter((p) => Math.abs(p - res.page) <= 2 || p === 1 || p === res.pages).map((p, i, arr) => (
                <span key={p} className="flex items-center gap-2">
                  {i > 0 && arr[i - 1] !== p - 1 && <span aria-hidden>…</span>}
                  <Link href={pageHref(p)} aria-current={p === res.page ? "page" : undefined}
                    className={`grid h-10 w-10 place-items-center ${p === res.page ? "bg-aubergine text-ivory" : "hover:bg-rose/60"}`}>{p}</Link>
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
    <header className="container-x pt-12 pb-10">
      <nav aria-label="Breadcrumb" className="text-xs text-charcoal/55">
        <ol className="flex flex-wrap gap-2">
          {crumbs.map((c, i) => (
            <li key={i} className="flex gap-2">{i > 0 && <span aria-hidden>/</span>}{c.href ? <Link href={c.href} className="hover:text-aubergine">{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>
          ))}
        </ol>
      </nav>
      <h1 className="display mt-6 text-5xl sm:text-7xl">{title}</h1>
      {intro && <p className="mt-4 max-w-xl text-charcoal/70 leading-relaxed">{intro}</p>}
    </header>
  );
}
