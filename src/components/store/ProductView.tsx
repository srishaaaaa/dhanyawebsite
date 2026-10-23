import Link from "next/link";
import { getApprovedReviews, getRelated, type ProductDetail } from "@/lib/catalog/queries";
import { renderMarkdown } from "@/lib/markdown";
import { getSettings } from "@/lib/settings";
import { withGst } from "@/lib/money";
import ProductInteractive from "./ProductInteractive";
import ProductCard from "./ProductCard";
import RecentlyViewed from "./RecentlyViewed";
import DeliveryCheck from "./DeliveryCheck";
import Stars from "./Stars";
import ShareButton from "./ShareButton";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function ProductView({ p, preview = false }: { p: ProductDetail; preview?: boolean }) {
  const [related, reviewList, { shipping }] = await Promise.all([getRelated(p), getApprovedReviews(p.id), getSettings()]);
  const price = withGst(p.price, p.gstRate);
  const inStock = p.variants.some((v) => v.available > 0);
  const crumbs = [{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, ...(p.category ? [{ label: p.category.name, href: `/category/${p.category.slug}` }] : []), { label: p.name }];

  const jsonLd = [{
    "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, description: p.seoDescription ?? p.description ?? undefined,
    image: p.images.map((i) => i.url), brand: { "@type": "Brand", name: p.designer ?? "DHANYA BOUTIQUE" }, material: p.material ?? undefined,
    offers: { "@type": "Offer", url: `${SITE}/products/${p.slug}`, priceCurrency: "INR", price: price.toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition" },
    ...(p.rating.n > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.avg, reviewCount: p.rating.n } } : {}),
  }, {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${SITE}${c.href}` } : {}) })),
  }];

  const details: [string, string | null][] = [
    ["Description", p.description], ["Fabric and material", p.material], ["Fit", p.fitInfo], ["Care", p.careInstructions],
  ];

  return (
    <article className="container-x pb-20 pt-10">
      {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      {preview && <p className="mb-6 border border-gold bg-gold/15 px-4 py-2 text-sm">Preview — status: <strong>{p.status}</strong>{p.publishAt ? `, publishes ${p.publishAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}. Shoppers can&apos;t see this page until it&apos;s active. <Link href={`/admin/products/${p.id}`} className="underline">Back to editor</Link></p>}
      <nav aria-label="Breadcrumb" className="mb-10 text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
        <ol className="flex flex-wrap gap-2">{crumbs.map((c, i) => <li key={i} className="flex gap-2">{i > 0 && <span aria-hidden>/</span>}{c.href ? <Link href={c.href} className="hover:text-aubergine">{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>)}</ol>
      </nav>

      <ProductInteractive
        product={{ id: p.id, slug: p.slug, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, gstRate: p.gstRate,
          images: p.images.map((i) => ({ url: i.url, altText: i.altText, colorName: i.colorName })), variants: p.variants }}
        video={p.videoUrl} model={p.model3dUrl} sizeGuide={p.sizeGuide}
        header={
          <header>
            {p.designer && <p className="kicker mb-5 !text-burgundy">{p.designer}</p>}
            <Link href={`/studio/${p.slug}`} data-cursor="ENTER" data-magnet className="btn-outline mb-6 !px-5 !py-2.5">Enter 3D studio</Link>
            <h1 className="display text-[clamp(2.6rem,4.6vw,4.8rem)] text-aubergine">{p.name}</h1>
            {p.rating.n > 0 && <a href="#reviews" className="mt-3 flex items-center gap-2 text-sm"><Stars value={Number(p.rating.avg)} /> <span className="text-charcoal/60">{p.rating.avg} · {p.rating.n} review{p.rating.n === 1 ? "" : "s"}</span></a>}
          </header>
        }
        below={
          <div className="mt-10 space-y-8">
            <DeliveryCheck days={shipping.deliveryDays ?? "4–7"} />
            <div className="divide-y divide-gold/30 border-y border-gold/30">
              {details.filter(([, v]) => v).map(([k, v], i) => (
                <details key={k} open={i === 0} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.26em]">{k}<span aria-hidden className="transition-transform group-open:rotate-45 text-lg leading-none">+</span></summary>
                  <div className="prose-dhanya mt-3 text-sm text-charcoal/80" dangerouslySetInnerHTML={{ __html: renderMarkdown(v!) }} />
                </details>
              ))}
              <details className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.26em]">Shipping and returns<span aria-hidden className="transition-transform group-open:rotate-45 text-lg leading-none">+</span></summary>
                <div className="mt-3 text-sm text-charcoal/80 space-y-2">
                  <p>{shipping.freeShippingThreshold ? `Free shipping on orders over ₹${shipping.freeShippingThreshold.toLocaleString("en-IN")}. ` : ""}Usually dispatched within 1–2 working days.</p>
                  <p>Read our <Link href="/shipping-policy" className="underline">shipping policy</Link> and <Link href="/returns" className="underline">returns and exchanges</Link>.</p>
                </div>
              </details>
            </div>
            <dl className="grid grid-cols-2 gap-y-1 text-xs text-charcoal/55">
              <dt>SKU</dt><dd>{p.sku}</dd>
              {p.collections.length > 0 && <><dt>Collection</dt><dd>{p.collections.map((c, i) => <span key={c.slug}>{i > 0 && ", "}<Link href={`/collections/${c.slug}`} className="underline">{c.title}</Link></span>)}</dd></>}
            </dl>
            <ShareButton title={p.name} />
          </div>
        }
      />

      <section id="reviews" aria-labelledby="rev-h" className="mt-28 border-t border-gold/40 pt-16">
        <p className="kicker mb-5">Voices</p><h2 id="rev-h" className="display text-[clamp(2.6rem,5vw,4.5rem)] text-aubergine">Reviews</h2>
        {reviewList.length === 0 ? <p className="mt-4 text-charcoal/60">No reviews yet.</p> : (
          <ul className="mt-8 grid gap-10 md:grid-cols-2">
            {reviewList.map((r) => (
              <li key={r.id} className="border-t border-charcoal/10 pt-6">
                <Stars value={r.rating} />
                {r.title && <p className="mt-3 font-serif text-xl">{r.title}</p>}
                {r.body && <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{r.body}</p>}
                <p className="mt-3 text-xs text-charcoal/55">{r.author}{r.verified ? " · Verified buyer" : ""} · {r.createdAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="rel-h" className="mt-24">
          <p className="kicker mb-5">Complete the look</p><h2 id="rel-h" className="display mb-14 text-[clamp(2.6rem,5vw,4.5rem)] text-aubergine">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-16 lg:grid-cols-4">{related.slice(0, 4).map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
      <RecentlyViewed exclude={p.id} />
    </article>
  );
}
