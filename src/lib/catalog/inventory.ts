import "server-only";
import { sql } from "drizzle-orm";

// Each helper is ONE SQL statement (CTE), so the stock change and its movement row are atomic
// even on the Neon HTTP driver. DB check constraints (stock >= 0, reserved <= stock) block oversell.

export function setStockSql(variantId: string, newStock: number, reason: string, note: string | null, actorId: string | null) {
  return sql`
    WITH old AS (SELECT id, stock FROM product_variants WHERE id = ${variantId} FOR UPDATE),
    upd AS (
      UPDATE product_variants v SET stock = ${newStock}, updated_at = now()
      FROM old WHERE v.id = old.id
      RETURNING v.id, (${newStock}::int - old.stock) AS delta
    )
    INSERT INTO inventory_movements (variant_id, delta, reason, note, actor_id)
    SELECT id, delta, ${reason}, ${note}, ${actorId} FROM upd WHERE delta <> 0`;
}

export function adjustStockSql(variantId: string, delta: number, reason: string, note: string | null, actorId: string | null) {
  return sql`
    WITH upd AS (
      UPDATE product_variants SET stock = stock + ${delta}::int, updated_at = now()
      WHERE id = ${variantId} RETURNING id
    )
    INSERT INTO inventory_movements (variant_id, delta, reason, note, actor_id)
    SELECT id, ${delta}::int, ${reason}, ${note}, ${actorId} FROM upd`;
}
