import { desc, eq } from "drizzle-orm";
import { products } from "@/db/schema";
import type { Section } from "@/lib/homepage-schema";
import {
  getVisibleCollections, getVisibleCategories, getAtelierRooms, getNewArrivals, getBestsellers, getCardsByIds, getFeaturedReviews, getCards,
} from "@/lib/catalog/queries";
import Hero from "./Hero";
import Banner from "./Banner";
import Collections from "./Collections";
import ProductRail from "./ProductRail";
import Campaign from "./Campaign";
import Story from "./Story";
import Occasions from "./Occasions";
import Categories from "./Categories";
import Testimonials from "./Testimonials";
import Newsletter from "./Newsletter";
import EditorialIntro from "./EditorialIntro";
import HomeMotion from "./HomeMotion";
import SilkBand from "../silk/SilkBand";
import ProductCard from "../ProductCard";
import Atelier from "./Atelier";
import Gallery from "./Gallery";
import Recommendations from "./Recommendations";
import { getActiveCampaigns } from "@/lib/campaigns";
import { getSettings } from "@/lib/settings";

const safe = async <T,>(p: Promise<T>, fallback: T) => { try { return await p; } catch (e) { console.error(e); return fallback; } };

/** Renders a list of homepage sections (live or draft preview). */
export default async function HomeView({ sections }: { sections: Section[] }) {
  const types = new Set(sections.map((s) => s.type));
  const [collections, occasions, allCategories, arrivals, favourites, reviews, featured, promos, rooms, { store }, picks] = await Promise.all([
    types.has("collections") || types.has("hero") ? safe(getVisibleCollections(), []) : [],
    types.has("occasions") ? safe(getVisibleCategories(true), []) : [],
    types.has("categories") ? safe(getVisibleCategories(false), []) : [],
    types.has("new_arrivals") ? safe(getNewArrivals(24), []) : [],
    types.has("favorites") ? safe(getBestsellers(24), []) : [],
    types.has("testimonials") ? safe(getFeaturedReviews(6), []) : [],
    safe(getCards(eq(products.isFeatured, true), [desc(products.updatedAt)], 4), []),
    getActiveCampaigns("banner"),
    safe(getAtelierRooms(), []),
    getSettings(),
    safe(getCards(undefined, [desc(products.isFeatured), desc(products.updatedAt)], 3), []),
  ]);
  // Campaign/story sections without their own artwork borrow a featured product photo.
  const borrowed = [...featured, ...arrivals].flatMap((p) => p.images.map((i) => i.url));
  let firstAfterHero = true;

  // Brief sequence: hero, categories, bestsellers, featured pieces, Atelier, festive/wedding edit, story, picks, gallery, reviews, newsletter.
  const ORDER = ["hero", "banner", "categories", "favorites", "new_arrivals", "atelier", "occasions", "collections", "campaign", "story", "picks", "gallery", "testimonials", "newsletter"];
  const synthetic = [{ id: "atelier", type: "atelier" }, { id: "picks", type: "picks" }, { id: "gallery", type: "gallery" }] as unknown as Section[];
  const ordered = [...sections, ...synthetic].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  const galleryImages = [...featured, ...arrivals, ...favourites].flatMap((p) => p.images.map((i) => ({ url: i.url, href: `/products/${p.slug}`, alt: i.alt || p.name })))
    .filter((v, i, a) => a.findIndex((x) => x.url === v.url) === i);

  const rendered = await Promise.all(ordered.map(async (s, idx) => {
    const anchor = s.type !== "hero" && firstAfterHero ? ((firstAfterHero = false), "after-hero") : undefined;
    let node: React.ReactNode = null;
    const t = s.type as string;
    if (t === "atelier") return <div key={s.id}><Atelier rooms={rooms} /></div>;
    if (t === "picks") return <div key={s.id}><Recommendations products={picks} /></div>;
    if (t === "gallery") return <div key={s.id}><Gallery images={galleryImages.slice(0, 6)} instagram={store.social?.instagram} /></div>;
    switch (s.type) {
      case "hero": node = <><Hero c={s.content} portals={collections.map((c) => ({ slug: c.slug, title: c.title }))} /><EditorialIntro heading="Considered silhouettes, expressive textiles." body={s.content.subheading} images={borrowed.slice(0, 2)} cta={s.content.secondaryCta?.label ? s.content.secondaryCta : s.content.primaryCta} />{promos.map((p) => <Banner key={p.id} c={{ text: p.content.text, cta: p.content.href ? { label: p.content.ctaLabel || "Shop now", href: p.content.href } : undefined, tone: p.content.tone ?? "gold" }} />)}</>; break;
      case "banner": node = <Banner c={s.content} />; break;
      case "collections": node = <><Collections c={s.content} collections={collections} /><SilkBand words={collections.slice(0, 6).map((c) => c.title)} /></>; break;
      case "new_arrivals": {
        const items = s.content.productIds?.length ? await safe(getCardsByIds(s.content.productIds), []) : arrivals.slice(0, s.content.limit ?? 12);
        node = <ProductRail title={s.content.title} intro={s.content.intro} products={items} href="/shop?sort=newest" />; break;
      }
      case "campaign": node = <Campaign c={{ ...s.content, image: s.content.image || borrowed[idx % Math.max(borrowed.length, 1)] }} />; break;
      case "story": node = <Story c={{ ...s.content, image: s.content.image || borrowed[1] }} images={[borrowed[1], borrowed[2], borrowed[3]].filter(Boolean) as string[]} />; break;
      case "categories": node = <Categories title={s.content.title} intro={s.content.intro} items={allCategories.filter((c) => !c.parentId)} showCollections={s.content.showCollections !== "no"} />; break;
      case "occasions": node = <Occasions title={s.content.title} items={occasions} />; break;
      case "favorites": {
        const items = s.content.productIds?.length ? await safe(getCardsByIds(s.content.productIds), []) : favourites.slice(0, s.content.limit ?? 8);
        node = items.length ? (
          <section aria-labelledby={`fav-${s.id}`} className="container-x py-24 sm:py-32">
            <p className="kicker mb-6" data-reveal>Most loved</p>
            <h2 id={`fav-${s.id}`} className="display text-[clamp(2.8rem,6vw,6.5rem)] text-aubergine" data-reveal>{s.content.title}</h2>
            {s.content.intro && <p className="mb-14 mt-4 max-w-md text-charcoal/65">{s.content.intro}</p>}
            <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-16 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
        ) : null; break;
      }
      case "testimonials": node = <Testimonials title={s.content.title} reviews={reviews} />; break;
      case "newsletter": node = <Newsletter c={s.content} />; break;
    }
    return <div key={s.id} id={anchor}>{node}</div>;
  }));

  return (
    <>
      <HomeMotion />
      {rendered}
      {arrivals.length === 0 && collections.length === 0 && types.has("new_arrivals") && (
        <section className="container-x py-24 text-center">
          <p className="font-serif text-3xl">The new collection is being prepared.</p>
          <p className="mt-3 text-charcoal/60">Leave your email and we&apos;ll let you know the moment it arrives.</p>
        </section>
      )}
    </>
  );
}
