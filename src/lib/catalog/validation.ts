import { z } from "zod";
import { SLUG_RE } from "@/lib/slug";

const money = z.coerce.number().min(0, "Must be 0 or more").max(10_000_000).multipleOf(0.01, "Use at most 2 decimals");
const optMoney = z.union([z.literal(""), z.null(), z.undefined(), money]).transform((v) => (v === "" || v == null ? null : v));
const optText = (max = 5000) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const url = z.string().trim().max(2000).refine((v) => /^https:\/\//.test(v) || v.startsWith("/"), "Use an https:// URL");
const optUrl = z.union([z.literal(""), z.null(), z.undefined(), url]).transform((v) => (v ? v : null));
const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #54162F");

export const variantInput = z.object({
  id: z.string().uuid().optional().nullable(),
  sku: z.string().trim().min(1, "Variant SKU is required").max(64).regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, . _ - only"),
  size: optText(40),
  color: optText(60),
  colorHex: z.union([z.literal(""), z.null(), z.undefined(), hex]).transform((v) => (v ? v : null)),
  priceOverride: optMoney,
  stock: z.coerce.number().int().min(0, "Stock can't be negative").max(1_000_000),
  isActive: z.boolean().default(true),
});

export const imageInput = z.object({
  id: z.string().uuid().optional().nullable(),
  url,
  altText: optText(300),
  colorName: optText(60),
});

export const productInput = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2, "Name is required").max(160),
  slug: z.string().trim().min(2).max(80).regex(SLUG_RE, "Lowercase letters, numbers and hyphens only"),
  sku: z.string().trim().min(1, "SKU is required").max(64).regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, . _ - only"),
  description: optText(20000),
  designer: optText(120),
  categoryId: z.union([z.literal(""), z.null(), z.undefined(), z.string().uuid()]).transform((v) => (v ? v : null)),
  collectionIds: z.array(z.string().uuid()).max(50).default([]),
  productType: optText(80),
  price: money,
  compareAtPrice: optMoney,
  gstRate: z.coerce.number().min(0).max(28),
  hsnCode: z.union([z.literal(""), z.null(), z.undefined(), z.string().trim().regex(/^\d{4,8}$/, "HSN is 4–8 digits")]).transform((v) => (v ? v : null)),
  material: optText(500),
  careInstructions: optText(2000),
  fitInfo: optText(1000),
  sizeGuide: optText(5000),
  weightGrams: z.union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int().min(0).max(100000)]).transform((v) => (v === "" || v == null ? null : v)),
  tags: z.array(z.string().trim().min(1).max(40)).max(40).default([]),
  videoUrl: optUrl,
  model3dUrl: optUrl,
  seoTitle: optText(70),
  seoDescription: optText(170),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000).default(3),
  status: z.enum(["draft", "active", "archived"]),
  publishAt: z.union([z.literal(""), z.null(), z.undefined(), z.coerce.date()]).transform((v) => (v ? v : null)),
  relatedProductIds: z.array(z.string().uuid()).max(12).default([]),
  images: z.array(imageInput).max(30).default([]),
  variants: z.array(variantInput).min(1, "Add at least one variant (use 'One size' for single items)").max(200),
}).superRefine((p, ctx) => {
  if (p.compareAtPrice !== null && p.compareAtPrice <= p.price) {
    ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "Compare-at price should be higher than the selling price" });
  }
  const skus = new Set<string>(); const combos = new Set<string>();
  p.variants.forEach((v, i) => {
    const s = v.sku.toUpperCase();
    if (skus.has(s)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Duplicate variant SKU" });
    skus.add(s);
    const c = `${v.size ?? ""}|${v.color ?? ""}`.toLowerCase();
    if (combos.has(c)) ctx.addIssue({ code: "custom", path: ["variants", i, "size"], message: "Duplicate size + colour" });
    combos.add(c);
  });
  if (p.status === "active" && p.images.length === 0) {
    ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one image before publishing" });
  }
  if (p.id && p.relatedProductIds.includes(p.id)) {
    ctx.addIssue({ code: "custom", path: ["relatedProductIds"], message: "A product can't be related to itself" });
  }
});
export type ProductInput = z.input<typeof productInput>;

export const categoryInput = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(SLUG_RE, "Lowercase letters, numbers and hyphens only"),
  description: optText(1000),
  imageUrl: optUrl,
  parentId: z.union([z.literal(""), z.null(), z.undefined(), z.string().uuid()]).transform((v) => (v ? v : null)),
  isOccasion: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isVisible: z.boolean().default(true),
}).refine((c) => !c.id || c.parentId !== c.id, { path: ["parentId"], message: "A category can't be its own parent" });

export const collectionInput = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(SLUG_RE, "Lowercase letters, numbers and hyphens only"),
  description: optText(1000),
  imageUrl: optUrl,
  ctaLabel: optText(40),
  ctaHref: optUrl,
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isVisible: z.boolean().default(true),
});

export const STOCK_REASONS = ["restock", "correction", "damaged", "return", "count"] as const;
export const stockAdjustInput = z.object({
  variantId: z.string().uuid(),
  mode: z.enum(["delta", "set"]),
  amount: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  reason: z.enum(STOCK_REASONS),
  note: optText(300),
}).refine((a) => a.mode === "set" ? a.amount >= 0 : a.amount !== 0, { path: ["amount"], message: "Enter a non-zero change, or a new total of 0 or more" });

/** Flattens zod issues into { "variants.0.sku": "message" } for the form. */
export function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) { const k = i.path.join("."); if (!out[k]) out[k] = i.message; }
  return out;
}
