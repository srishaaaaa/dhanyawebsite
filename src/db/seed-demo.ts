import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, inArray, like, sql } from "drizzle-orm";
import * as s from "./schema";

/**
 * DEVELOPMENT ONLY. Adds clearly-labelled sample catalogue data so the storefront has something to render.
 * Every product SKU starts with DEMO- and is tagged "demo". Remove it all with:  npm run db:seed:demo -- --remove
 *
 * Photography: free-licence Unsplash images (https://unsplash.com/license), hot-linked as placeholders — replace them
 * with your own photography from the admin. Photographers: shades by 43, inesh thamotharampillai, Bella Pon Fruitsia,
 * Sabesh Photography LTD, Bulbul Ahmed, Horitoki Ltd, Souravi Sinha, Jainica Dhingra.
 */
const u = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const IMG = {
  seaside: "1727430228383-aa1fb59db8bf", temple: "1618901185975-d59f7091bcfe", purple: "1641699862936-be9f49b1c38d", pink: "1617627143750-d86bc21e42bb",
  teal: "1676696706907-0e04665b80bd", aubergine: "1610030469983-98e550d6193c", organza: "1692992193981-d3d92fabd9cb", zari: "1588140686379-1b76a52103dc",
  banarasi: "1717585679395-bbe39b5fb6bc", forest: "1619516388835-2b60acc4049e", blue1: "1610189012906-4c0aa9b9781e", blue2: "1610189013429-a703f4b245cf", sage: "1609748340041-f5d61e061ebc",
};

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) throw new Error("Refusing to seed demo data in production.");
  const db = drizzle(neon(process.env.DATABASE_URL!));

  if (process.argv.includes("--remove")) {
    const ids = (await db.select({ id: s.products.id }).from(s.products).where(like(s.products.sku, "DEMO-%"))).map((r) => r.id);
    if (ids.length) {
      const vids = (await db.select({ id: s.productVariants.id }).from(s.productVariants).where(inArray(s.productVariants.productId, ids))).map((r) => r.id);
      if (vids.length) await db.delete(s.inventoryMovements).where(inArray(s.inventoryMovements.variantId, vids));
      await db.delete(s.productVariants).where(and(inArray(s.productVariants.productId, ids),
        sql`${s.productVariants.id} not in (select variant_id from order_items where variant_id is not null)`));
      await db.delete(s.products).where(and(inArray(s.products.id, ids),
        sql`not exists (select 1 from product_variants v where v.product_id = ${s.products.id})`));
    }
    await db.delete(s.collections).where(like(s.collections.slug, "demo-%"));
    await db.delete(s.categories).where(like(s.categories.slug, "demo-%"));
    await db.delete(s.homepageSections).where(sql`${s.homepageSections.content}->>'_demo' = 'true'`);
    console.log(`Removed demo data (${ids.length} products).`);
    return;
  }

  const catDefs: [string, string, string][] = [
    ["Sarees", "Silk, zari and woven drapes.", IMG.aubergine], ["Blouses", "Cut, embroidered and finished to match.", IMG.pink],
    ["Festive Wear", "Colour, shimmer and celebration.", IMG.temple], ["Everyday Wear", "Easy drapes with quiet detail.", IMG.sage],
  ];
  const cats = await db.insert(s.categories).values(catDefs.map(([name, description, img], i) => ({
    name, description, imageUrl: u(img, 900), slug: `demo-${name.toLowerCase().replace(/\s+/g, "-")}`, isOccasion: i >= 2, sortOrder: i * 10,
  }))).onConflictDoNothing().returning();
  const cat = (name: string) => cats.find((c) => c.name === name)?.id ?? null;

  const colDefs: [string, string, string][] = [
    ["Festive Edit", "Zari, silk and colour at full volume.", IMG.temple], ["Silk Heritage", "Heirloom weaves, worn now.", IMG.zari],
    ["Wedding Edit", "For the sangeet, the mehendi and the main event.", IMG.purple], ["Everyday Elegance", "Lighter drapes for ordinary days.", IMG.sage],
    ["Banarasi Weaves", "Brocade borders and gold motifs.", IMG.banarasi],
  ];
  const cols = await db.insert(s.collections).values(colDefs.map(([title, description, img], i) => ({
    title, description, imageUrl: u(img, 1400), slug: `demo-${title.toLowerCase().replace(/\s+/g, "-")}`, sortOrder: i * 10,
  }))).onConflictDoNothing().returning();
  const col = (title: string) => cols.find((c) => c.title === title)?.id;

  // name, price (ex-GST), compare-at, colours, sizes, category, collections, images, flags
  type P = [string, number, number | null, string, string[], string, string[], string[], { n?: boolean; b?: boolean; f?: boolean }];
  const SAREE = ["Free size"], BL = ["S", "M", "L", "XL"];
  const samples: P[] = [
    ["Kanjivaram silk saree, crimson and gold", 18500, 21000, "Crimson:#8B1A2B,Antique gold:#C8A66A", SAREE, "Sarees", ["Silk Heritage", "Wedding Edit"], [IMG.seaside, IMG.temple], { n: true, b: true, f: true }],
    ["Amethyst zari silk saree", 14200, null, "Aubergine:#30042E,Amethyst:#6B3FA0", SAREE, "Sarees", ["Wedding Edit", "Silk Heritage"], [IMG.purple, IMG.aubergine], { n: true, b: true }],
    ["Aubergine silk saree with antique zari border", 12800, 14500, "Aubergine:#30042E", SAREE, "Sarees", ["Silk Heritage", "Festive Edit"], [IMG.aubergine, IMG.purple], { n: true }],
    ["Rose-pink temple border saree", 9600, null, "Rose:#D98A9E,Gold:#C8A66A", SAREE, "Sarees", ["Festive Edit"], [IMG.pink, IMG.forest], { n: true, b: true }],
    ["Indigo organza saree with floral jaal", 7400, 8800, "Indigo:#2B3A7A", SAREE, "Sarees", ["Everyday Elegance"], [IMG.organza], { n: true }],
    ["Sage chanderi saree with zari butis", 6200, null, "Sage:#A9C0A6,Ivory:#F8F3EB", SAREE, "Everyday Wear", ["Everyday Elegance"], [IMG.sage], { b: true }],
    ["Cobalt cotton-silk saree, golden stripe", 5400, 6200, "Cobalt:#1F3C88", SAREE, "Everyday Wear", ["Everyday Elegance"], [IMG.blue1, IMG.blue2], {}],
    ["Banarasi brocade saree, wine and gold", 16800, null, "Wine:#54162F", SAREE, "Festive Wear", ["Banarasi Weaves", "Festive Edit"], [IMG.banarasi, IMG.zari], { b: true }],
    ["Puff-sleeve zari silk blouse", 3200, 3800, "Fuchsia:#B0246B,Gold:#C8A66A", BL, "Blouses", ["Festive Edit", "Wedding Edit"], [IMG.pink, IMG.forest], { n: true, b: true }],
    ["Velvet blouse with gold edge", 2900, null, "Black:#211D20,Aubergine:#30042E", BL, "Blouses", ["Festive Edit"], [IMG.aubergine], { n: true }],
    ["Handloom cotton blouse, olive", 2100, 2500, "Olive:#6B7A3A,Ivory:#F8F3EB", BL, "Blouses", ["Everyday Elegance"], [IMG.sage], {}],
    ["Brocade blouse, red and gold", 3400, null, "Crimson:#8B1A2B", BL, "Blouses", ["Banarasi Weaves", "Festive Edit"], [IMG.temple, IMG.zari], { b: true }],
  ];
  let n = 0;
  for (const [name, price, compare, colorList, sizes, category, colTitles, imgs, flag] of samples) {
    const sku = `DEMO-${String(++n).padStart(3, "0")}`;
    const [p] = await db.insert(s.products).values({
      name, sku, slug: `demo-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`, price: price.toFixed(2), compareAtPrice: compare?.toFixed(2) ?? null,
      gstRate: "5", description: "**Demo product** — placeholder text and photography for development. Replace with your real catalogue in Admin → Products.",
      material: "Demo fabric details.", careInstructions: "Dry clean recommended.", tags: ["demo"], status: "active",
      isNewArrival: Boolean(flag.n), isBestseller: Boolean(flag.b), isFeatured: Boolean(flag.f), categoryId: cat(category),
    }).onConflictDoNothing().returning();
    if (!p) continue;
    const colors = colorList.split(",").map((c) => c.split(":"));
    await db.insert(s.productVariants).values(colors.flatMap(([color, hex]) => sizes.map((size) => ({
      productId: p.id, sku: `${sku}-${size.replace(/\s/g, "").toUpperCase()}-${color.replace(/\s/g, "").slice(0, 3).toUpperCase()}`, size, color, colorHex: hex, stock: 4 + ((n * 7) % 9),
    }))));
    await db.insert(s.productImages).values(imgs.map((id, i) => ({ productId: p.id, url: u(id, 1000), altText: i === 0 ? name : null, sortOrder: i })));
    const cids = colTitles.map(col).filter(Boolean) as string[];
    if (cids.length) await db.insert(s.productCollections).values(cids.map((collectionId) => ({ productId: p.id, collectionId }))).onConflictDoNothing();
  }

  // Published homepage layout (only if the store has none yet, so a real layout is never overwritten).
  const [{ n: existing }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.homepageSections);
  let sections = 0;
  if (existing === 0) {
    const home: [string, Record<string, unknown>][] = [
      ["hero", { image: u(IMG.purple, 1400), image2: u(IMG.seaside, 800), imageAlt: "A woman draped in an amethyst and gold silk saree" }],
      ["new_arrivals", { title: "New arrivals", intro: "Fresh from the loom and the atelier this season.", limit: 12 }],
      ["categories", { title: "Shop by category", intro: "Find your way in — by drape, by blouse, by occasion.", showCollections: "yes" }],
      ["collections", { title: "Featured collections", intro: "Curated stories in silk and zari — each one a way of dressing for the life you lead." }],
      ["favorites", { title: "Bestsellers", intro: "The pieces our customers return to.", limit: 8 }],
      ["story", { heading: "The Dhanya story", body: "Dhanya began with a simple belief: what you wear should feel like it was meant for you. Every saree and blouse in the boutique is chosen for its fabric, its finish and the story it carries — so that getting dressed feels less like a routine and more like a ritual.", image: u(IMG.banarasi, 1800), imageAlt: "Banarasi silk with gold zari", cta: { label: "READ OUR STORY", href: "/about" } }],
      ["campaign", { kicker: "Festive season", heading: "The Festive Edit.", body: "Zari, silk and colour at full volume — sarees and blouses chosen for weddings, pujas and every celebration in between.", image: u(IMG.temple, 1400), imageAlt: "A woman in a red silk saree seated beside a temple wall", cta: { label: "SHOP THE EDIT", href: "/collections/demo-festive-edit" }, imageSide: "left", tone: "dark" }],
      ["testimonials", { title: "In their words" }],
      ["newsletter", { title: "Be the first to see what's next", intro: "New arrivals, festive edits and private previews — a few thoughtful letters a month." }],
    ];
    await db.insert(s.homepageSections).values(home.map(([type, content], i) => ({
      type, content: { ...content, _demo: true }, sortOrder: i * 10, isVisible: true, status: "published" as const,
    })));
    sections = home.length;
  }
  console.log(`Demo data added: ${cats.length} categories, ${cols.length} collections, ${n} products (SKUs DEMO-…), ${sections} homepage sections.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
