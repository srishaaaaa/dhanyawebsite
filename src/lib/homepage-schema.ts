// Shared (client + server) homepage content model, defaults and validation.
import { z } from "zod";

const link = z.string().trim().max(300).refine((v) => v === "" || v.startsWith("/") || v.startsWith("https://") || v.startsWith("#"), "Use a site path like /shop or an https:// link");
const media = z.string().trim().max(2000).refine((v) => v === "" || v.startsWith("https://") || v.startsWith("/"), "Use an https:// URL").optional();
const hex = z.string().trim().refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "Use a colour like #30042E").optional();
const cta = z.object({ label: z.string().trim().max(40), href: link });
const ids = z.array(z.string().uuid()).max(24).optional();

export const SECTION_SCHEMAS = {
  hero: z.object({
    heading: z.string().trim().min(2, "Add a headline").max(80), subheading: z.string().trim().max(200),
    primaryCta: cta, secondaryCta: cta, image: media, image2: media, mobileImage: media, imageAlt: z.string().trim().max(150).optional(), video: media,
    scene: z.enum(["silk3d", "silk", "none"]).default("silk3d"), bg: hex, accent: hex,
  }),
  banner: z.object({ text: z.string().trim().min(2, "Add the banner text").max(160), cta: cta.optional(), tone: z.enum(["gold", "aubergine", "rose"]).default("gold") }),
  collections: z.object({ title: z.string().trim().min(1).max(60), intro: z.string().trim().max(240).optional(), collectionIds: ids }),
  new_arrivals: z.object({ title: z.string().trim().min(1).max(60), intro: z.string().trim().max(240).optional(), limit: z.coerce.number().int().min(2).max(24).default(12), productIds: ids }),
  favorites: z.object({ title: z.string().trim().min(1).max(60), intro: z.string().trim().max(240).optional(), limit: z.coerce.number().int().min(2).max(24).default(8), productIds: ids }),
  campaign: z.object({
    kicker: z.string().trim().max(40).optional(), heading: z.string().trim().min(2).max(80), body: z.string().trim().max(600),
    image: media, imageAlt: z.string().trim().max(150).optional(), cta: cta.optional(), imageSide: z.enum(["left", "right"]).default("left"),
    tone: z.enum(["dark", "light"]).default("dark"), bg: hex,
  }),
  story: z.object({ heading: z.string().trim().min(2).max(80), body: z.string().trim().max(1200), image: media, imageAlt: z.string().trim().max(150).optional(), cta: cta.optional() }),
  categories: z.object({ title: z.string().trim().min(1).max(60), intro: z.string().trim().max(240).optional(), showCollections: z.enum(["yes", "no"]).default("yes") }),
  occasions: z.object({ title: z.string().trim().min(1).max(60), intro: z.string().trim().max(240).optional() }),
  testimonials: z.object({ title: z.string().trim().min(1).max(60), intro: z.string().trim().max(240).optional() }),
  newsletter: z.object({ title: z.string().trim().min(1).max(80), intro: z.string().trim().max(240).optional() }),
};
export type SectionType = keyof typeof SECTION_SCHEMAS;
export type ContentMap = { [K in SectionType]: z.output<(typeof SECTION_SCHEMAS)[K]> };
export type Section = { [K in SectionType]: { id: string; type: K; content: ContentMap[K] } }[SectionType];
export type Cta = z.output<typeof cta>;
export type HeroContent = ContentMap["hero"];
export type CollectionsContent = ContentMap["collections"];
export type ProductsContent = ContentMap["new_arrivals"];
export type CampaignContent = ContentMap["campaign"];
export type StoryContent = ContentMap["story"];
export type BannerContent = ContentMap["banner"];
export type SimpleContent = ContentMap["occasions"];

/** Editable draft entry: content plus layout/schedule attributes. */
export type DraftSection = { id: string; type: SectionType; content: Record<string, unknown>; isVisible: boolean; publishAt: string | null; unpublishAt: string | null };

export const SECTION_LABEL: Record<SectionType, string> = {
  hero: "Hero", banner: "Promo banner", collections: "Featured collections", new_arrivals: "New arrivals", favorites: "Customer favourites",
  campaign: "Editorial campaign", story: "Brand story", categories: "Shop by category", occasions: "Shop by occasion", testimonials: "Testimonials", newsletter: "Newsletter",
};

export const DEFAULTS: ContentMap = {
  hero: {
    heading: "Tradition, sculpted into something extraordinary.",
    subheading: "Discover contemporary Indian elegance through considered silhouettes, expressive textiles and timeless occasionwear.",
    primaryCta: { label: "EXPLORE THE COLLECTION", href: "/shop" },
    secondaryCta: { label: "DISCOVER NEW ARRIVALS", href: "/shop?sort=newest" },
    scene: "silk3d",
  },
  banner: { text: "Festive edit now live — complimentary shipping on orders over ₹2,999", cta: { label: "Shop now", href: "/shop" }, tone: "gold" },
  collections: { title: "The edits", intro: "Curated stories in silk, cotton and craft — each one a way of dressing for the life you lead." },
  new_arrivals: { title: "Just arrived", intro: "Fresh from the atelier this season.", limit: 12 },
  campaign: {
    kicker: "Festive season", heading: "The Festive Edit.",
    body: "Zari, silk and colour at full volume — sarees and blouses chosen for weddings, pujas and every celebration in between.",
    cta: { label: "SHOP THE EDIT", href: "/shop" }, imageSide: "left", tone: "dark",
  },
  story: {
    heading: "A boutique, chosen by hand.",
    body: "Dhanya began with a simple belief: what you wear should feel like it was meant for you. Every piece in the boutique is selected for its fabric, its finish and the way it carries a story — so that getting dressed feels less like a routine and more like a ritual.",
    cta: { label: "READ OUR STORY", href: "/about" },
  },
  categories: { title: "Shop by category", intro: "Find your way in — by drape, by blouse, by occasion.", showCollections: "yes" },
  occasions: { title: "Dress for the moment" },
  favorites: { title: "Customer favourites", intro: "The pieces our customers return to.", limit: 8 },
  testimonials: { title: "In their words" },
  newsletter: { title: "Be the first to see what's next", intro: "New arrivals, festive edits and private previews — a few thoughtful letters a month." },
};

export const DEFAULT_ORDER: SectionType[] = ["hero", "new_arrivals", "categories", "collections", "favorites", "story", "campaign", "testimonials", "newsletter"];

/** Validates one section; returns cleaned content or field errors keyed by path. */
export function validateSection(type: SectionType, content: unknown) {
  const schema = SECTION_SCHEMAS[type];
  if (!schema) return { ok: false as const, errors: { _: "Unknown section type" } };
  const r = schema.safeParse(content);
  if (r.success) return { ok: true as const, content: r.data as Record<string, unknown> };
  return { ok: false as const, errors: Object.fromEntries(r.error.issues.map((i) => [i.path.join(".") || "_", i.message])) };
}
