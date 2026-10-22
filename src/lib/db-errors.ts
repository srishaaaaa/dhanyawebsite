type PgErr = { code?: string; constraint?: string; detail?: string; cause?: PgErr };

function pg(e: unknown): PgErr {
  const err = (e ?? {}) as PgErr;
  return err.code ? err : err.cause ?? err;
}

const MESSAGES: Record<string, string> = {
  products_slug_unique: "Another product already uses this URL slug.",
  products_sku_unique: "Another product already uses this SKU.",
  product_variants_sku_unique: "A variant SKU is already in use. Variant SKUs must be unique across the store.",
  variants_unique_combo: "Two variants have the same size and colour.",
  categories_slug_unique: "Another category already uses this slug.",
  collections_slug_unique: "Another collection already uses this slug.",
  stock_nonneg: "Stock can't go below zero.",
  reserved_valid: "Stock can't go below the quantity currently reserved by checkouts in progress.",
  qty_pos: "Quantity must be at least 1.",
};

/** Turns a Postgres error into a message safe to show to staff. Returns null for unknown errors. */
export function friendlyDbError(e: unknown): string | null {
  const p = pg(e);
  if (p.constraint && MESSAGES[p.constraint]) return MESSAGES[p.constraint];
  const text = String((e as Error)?.message ?? "");
  for (const [k, msg] of Object.entries(MESSAGES)) if (text.includes(k)) return msg;
  if (p.code === "23505") return "That value is already in use.";
  if (p.code === "23514") return "One of the values isn't allowed.";
  if (p.code === "23503") return "This record is still referenced elsewhere (for example by an order).";
  return null;
}
