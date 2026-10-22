import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  products, productImages, productVariants, categories, collections, productCollections, reviews,
} from "@/db/schema";

/** A product is public when active and its publish time (if any) has passed. */
export const isPublished = () => and(eq(products.status, "active"), or(isNull(products.publishAt), lte(products.publishAt, sql`now()`)))!;

export type CardProduct = {
  id: string; slug: string; name: string; price: string; compareAtPrice: string | null; gstRate: string;
  isNewArrival: boolean; isBestseller: boolean; images: { url: string; alt: string | null }[];
  colors: { name: string; hex: string | null }[]; sizes: string[]; available: number;
};

// Correlated subqueries need the outer table spelled out: drizzle drops the qualifier in single-table selects.
const pid = sql.raw('"products"."id"');
const cardFields = {
  id: products.id, slug: products.slug, name: products.name, price: products.price, compareAtPrice: products.compareAtPrice,
  gstRate: products.gstRate, isNewArrival: products.isNewArrival, isBestseller: products.isBestseller,
  images: sql<{ url: string; alt: string | null }[]>`(select coalesce(json_agg(json_build_object('url', i.url, 'alt', i.alt_text) order by i.sort_order), '[]'::json)
    from (select url, alt_text, sort_order from product_images where product_id = ${pid} order by sort_order limit 2) i)`,
  colors: sql<{ name: string; hex: string | null }[]>`(select coalesce(jsonb_agg(distinct jsonb_build_object('name', v.color, 'hex', v.color_hex)), '[]'::jsonb)
    from product_variants v where v.product_id = ${pid} and v.is_active and v.color is not null)`,
  sizes: sql<string[]>`array(select distinct v.size from product_variants v where v.product_id = ${pid} and v.is_active and v.size is not null)`,
  available: sql<number>`coalesce((select sum(greatest(v.stock - v.reserved, 0)) from product_variants v where v.product_id = ${pid} and v.is_active), 0)::int`,
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "FREE SIZE", "ONE SIZE"];
export function sortSizes(s: string[]) {
  return [...s].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase()), ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b, "en", { numeric: true });
  });
}

const inclPrice = sql`(${products.price} * (1 + ${products.gstRate} / 100))`;

export type ListFilters = {
  category?: string; collection?: string; q?: string; sizes?: string[]; colors?: string[];
  min?: number; max?: number; inStock?: boolean; sort?: string; page?: number; per?: number; tag?: string;
};

export async function listProducts(f: ListFilters) {
  const per = Math.min(f.per ?? 24, 60);
  const page = Math.max(1, f.page ?? 1);
  const scope: SQL[] = [isPublished()];
  if (f.category) {
    // Includes direct children so a parent category shows its sub-categories' products.
    scope.push(sql`${products.categoryId} in (select c.id from categories c left join categories parent on parent.id = c.parent_id
      where c.is_visible and (c.slug = ${f.category} or parent.slug = ${f.category}))`);
  }
  if (f.collection) {
    scope.push(sql`exists (select 1 from product_collections pc join collections c on c.id = pc.collection_id
      where pc.product_id = ${pid} and c.slug = ${f.collection} and c.is_visible)`);
  }
  if (f.tag) scope.push(sql`${f.tag} = any(${products.tags})`);
  if (f.q) scope.push(searchCondition(f.q));

  const filters: SQL[] = [...scope];
  if (f.sizes?.length) filters.push(sql`exists (select 1 from product_variants v where v.product_id = ${pid} and v.is_active and v.size in ${sqlList(f.sizes)})`);
  if (f.colors?.length) filters.push(sql`exists (select 1 from product_variants v where v.product_id = ${pid} and v.is_active and lower(v.color) in ${sqlList(f.colors.map((c) => c.toLowerCase()))})`);
  if (f.min !== undefined) filters.push(sql`${inclPrice} >= ${f.min}`);
  if (f.max !== undefined) filters.push(sql`${inclPrice} <= ${f.max}`);
  if (f.inStock) filters.push(sql`exists (select 1 from product_variants v where v.product_id = ${pid} and v.is_active and v.stock - v.reserved > 0)`);

  const order: SQL[] = (() => {
    switch (f.sort) {
      case "price-asc": return [asc(inclPrice)];
      case "price-desc": return [desc(inclPrice)];
      case "discount": return [sql`coalesce((${products.compareAtPrice} - ${products.price}) / nullif(${products.compareAtPrice}, 0), 0) desc`];
      case "popular": return [sql`(select coalesce(sum(oi.quantity), 0) from order_items oi join product_variants v on v.id = oi.variant_id
          join orders o on o.id = oi.order_id where v.product_id = ${pid} and o.payment_status = 'paid') desc`, desc(products.isBestseller)];
      default: return [desc(sql`coalesce(${products.publishAt}, ${products.createdAt})`)];
    }
  })();

  const where = and(...filters);
  const [items, [{ n }], facets] = await Promise.all([
    db.select(cardFields).from(products).where(where).orderBy(...order, asc(products.id)).limit(per).offset((page - 1) * per),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(where),
    db.select({
      sizes: sql<string[]>`array(select distinct v.size from product_variants v join products p2 on p2.id = v.product_id where v.is_active and v.size is not null and p2.id in (select ${products.id} from ${products} where ${and(...scope)}))`,
      colors: sql<{ name: string; hex: string | null }[]>`(select coalesce(jsonb_agg(distinct jsonb_build_object('name', initcap(v.color), 'hex', v.color_hex)), '[]'::jsonb) from product_variants v where v.is_active and v.color is not null and v.product_id in (select ${products.id} from ${products} where ${and(...scope)}))`,
      minPrice: sql<number>`floor(coalesce(min(${inclPrice}), 0))::int`,
      maxPrice: sql<number>`ceil(coalesce(max(${inclPrice}), 0))::int`,
    }).from(products).where(and(...scope)),
  ]);
  const colorMap = new Map<string, { name: string; hex: string | null }>();
  for (const c of facets[0]?.colors ?? []) if (!colorMap.has(c.name.toLowerCase())) colorMap.set(c.name.toLowerCase(), c);
  return {
    items: items as CardProduct[], total: n, page, pages: Math.max(1, Math.ceil(n / per)),
    facets: { sizes: sortSizes(facets[0]?.sizes ?? []), colors: [...colorMap.values()], minPrice: facets[0]?.minPrice ?? 0, maxPrice: facets[0]?.maxPrice ?? 0 },
  };
}

function sqlList(values: string[]) {
  return sql`(${sql.join(values.slice(0, 30).map((v) => sql`${v}`), sql`, `)})`;
}

function searchCondition(q: string) {
  const term = `%${q.trim().slice(0, 80).replace(/[%_\\]/g, "\\$&")}%`;
  return or(
    ilike(products.name, term), ilike(products.sku, term), ilike(products.productType, term),
    sql`exists (select 1 from unnest(${products.tags}) t where t ilike ${term})`,
    sql`exists (select 1 from categories c where c.id = ${products.categoryId} and c.name ilike ${term})`,
    sql`exists (select 1 from product_collections pc join collections c on c.id = pc.collection_id where pc.product_id = ${pid} and c.title ilike ${term})`,
    sql`exists (select 1 from product_variants v where v.product_id = ${pid} and v.sku ilike ${term})`,
  )!;
}

export async function searchSuggestions(q: string) {
  if (q.trim().length < 2) return [];
  return db.select({ slug: products.slug, name: products.name, price: products.price, gstRate: products.gstRate,
    image: sql<string | null>`(select url from product_images i where i.product_id = ${pid} order by sort_order limit 1)` })
    .from(products).where(and(isPublished(), searchCondition(q))).orderBy(desc(products.isBestseller), asc(products.name)).limit(6);
}

export async function getCards(where: SQL | undefined, order: SQL[], limit: number) {
  return (await db.select(cardFields).from(products).where(and(isPublished(), where)).orderBy(...order).limit(limit)) as CardProduct[];
}

export async function getCardsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = (await db.select(cardFields).from(products).where(and(isPublished(), inArray(products.id, ids)))) as CardProduct[];
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as CardProduct[];
}

export const getNewArrivals = (limit = 12) =>
  getCards(eq(products.isNewArrival, true), [desc(sql`coalesce(${products.publishAt}, ${products.createdAt})`)], limit);

/** Real sales (paid orders, last 90 days) first; manual "bestseller" picks fill the rest. */
export async function getBestsellers(limit = 8) {
  const sold = await db.execute<{ id: string }>(sql`
    select v.product_id as id from order_items oi
    join orders o on o.id = oi.order_id and o.payment_status = 'paid' and o.created_at > now() - interval '90 days'
    join product_variants v on v.id = oi.variant_id
    group by v.product_id order by sum(oi.quantity) desc limit ${limit}`);
  const manual = await getCards(eq(products.isBestseller, true), [desc(products.updatedAt)], limit);
  const fromSales = await getCardsByIds(sold.rows.map((r) => r.id));
  const seen = new Set<string>(); const out: CardProduct[] = [];
  for (const p of [...manual, ...fromSales]) if (!seen.has(p.id) && out.length < limit) { seen.add(p.id); out.push(p); }
  return out;
}

export async function getVisibleCollections() {
  return db.select().from(collections).where(eq(collections.isVisible, true)).orderBy(asc(collections.sortOrder), asc(collections.title));
}
export async function getVisibleCategories(occasionsOnly = false) {
  return db.select().from(categories)
    .where(and(eq(categories.isVisible, true), occasionsOnly ? eq(categories.isOccasion, true) : undefined))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}
export async function getCollection(slug: string) {
  const [c] = await db.select().from(collections).where(and(eq(collections.slug, slug), eq(collections.isVisible, true))).limit(1);
  return c ?? null;
}
export async function getCategory(slug: string) {
  const [c] = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.isVisible, true))).limit(1);
  return c ?? null;
}

export async function getProduct(by: { slug: string } | { id: string }, opts: { includeUnpublished?: boolean } = {}) {
  const key = "slug" in by ? eq(products.slug, by.slug) : eq(products.id, by.id);
  const [p] = await db.select().from(products).where(and(key, opts.includeUnpublished ? undefined : isPublished())).limit(1);
  if (!p) return null;
  const [images, variants, cat, cols, rating] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(asc(productImages.sortOrder)),
    db.select({ id: productVariants.id, sku: productVariants.sku, size: productVariants.size, color: productVariants.color,
      colorHex: productVariants.colorHex, priceOverride: productVariants.priceOverride,
      available: sql<number>`greatest(${productVariants.stock} - ${productVariants.reserved}, 0)::int` })
      .from(productVariants).where(and(eq(productVariants.productId, p.id), eq(productVariants.isActive, true))),
    p.categoryId ? db.select({ name: categories.name, slug: categories.slug }).from(categories).where(eq(categories.id, p.categoryId)).limit(1) : Promise.resolve([]),
    db.select({ title: collections.title, slug: collections.slug }).from(productCollections)
      .innerJoin(collections, eq(collections.id, productCollections.collectionId))
      .where(and(eq(productCollections.productId, p.id), eq(collections.isVisible, true))),
    db.select({ avg: sql<string | null>`round(avg(${reviews.rating}), 1)`, n: sql<number>`count(*)::int` })
      .from(reviews).where(and(eq(reviews.productId, p.id), eq(reviews.status, "approved"))),
  ]);
  return { ...p, images, variants, category: cat[0] ?? null, collections: cols, rating: rating[0] };
}
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

export async function getRelated(p: ProductDetail, limit = 8) {
  const manual = await getCardsByIds(p.relatedProductIds);
  if (manual.length >= limit) return manual.slice(0, limit);
  const more = p.categoryId
    ? await getCards(and(eq(products.categoryId, p.categoryId), sql`${products.id} <> ${p.id}`), [desc(products.isBestseller), desc(products.createdAt)], limit)
    : [];
  const seen = new Set(manual.map((m) => m.id));
  return [...manual, ...more.filter((m) => !seen.has(m.id))].slice(0, limit);
}

export async function getApprovedReviews(productId: string, limit = 10) {
  return db.select({ id: reviews.id, rating: reviews.rating, title: reviews.title, body: reviews.body, photoUrls: reviews.photoUrls,
    createdAt: reviews.createdAt, verified: sql<boolean>`${reviews.orderItemId} is not null`,
    author: sql<string>`coalesce((select split_part(name, ' ', 1) from users u where u.id = ${reviews.userId}), 'Customer')` })
    .from(reviews).where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt)).limit(limit);
}

export async function getFeaturedReviews(limit = 6) {
  return db.select({ id: reviews.id, rating: reviews.rating, title: reviews.title, body: reviews.body, productName: products.name, productSlug: products.slug,
    verified: sql<boolean>`${reviews.orderItemId} is not null`,
    author: sql<string>`coalesce((select split_part(name, ' ', 1) from users u where u.id = ${reviews.userId}), 'Customer')` })
    .from(reviews).innerJoin(products, eq(products.id, reviews.productId))
    .where(and(eq(reviews.status, "approved"), eq(reviews.isFeatured, true), isPublished()))
    .orderBy(desc(reviews.createdAt)).limit(limit);
}
