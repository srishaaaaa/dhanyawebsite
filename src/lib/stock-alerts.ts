import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { sendEmail, layout, esc } from "@/lib/email";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Emails shoppers waiting for variants that are back in stock, then marks them notified.
 * Claims rows atomically (UPDATE … RETURNING), so concurrent calls never email anyone twice.
 * Called after restocks, product edits, CSV imports, cancellations/returns, and by the daily cron.
 */
export async function notifyBackInStock(limit = 200) {
  const res = await db.execute<{ id: string; email: string; name: string; slug: string; size: string | null; color: string | null }>(sql`
    WITH due AS (
      SELECT a.id FROM stock_alerts a
      JOIN product_variants v ON v.id = a.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE a.notified_at IS NULL AND v.is_active AND v.stock - v.reserved > 0
        AND p.status = 'active' AND (p.publish_at IS NULL OR p.publish_at <= now())
      ORDER BY a.created_at LIMIT ${limit}
      FOR UPDATE OF a SKIP LOCKED
    )
    UPDATE stock_alerts a SET notified_at = now() FROM due, product_variants v, products p
    WHERE a.id = due.id AND v.id = a.variant_id AND p.id = v.product_id
    RETURNING a.id, a.email, p.name, p.slug, v.size, v.color`).catch((e) => { console.error("stock alerts failed", e); return { rows: [] }; });
  for (const r of res.rows) {
    const what = `${r.name}${r.size ? ` in ${r.size}` : ""}${r.color ? `, ${r.color}` : ""}`;
    await sendEmail(r.email, `Back in stock: ${r.name}`, layout("It's back", `<p>Good news — <strong>${esc(what)}</strong> is available again. Stock is limited, so it may not last.</p>
      <p><a href="${SITE}/products/${r.slug}" style="background:#30042E;color:#F8F3EB;padding:12px 20px;text-decoration:none;display:inline-block">Shop now</a></p>
      <p style="font-size:12px;color:#777">You asked us to tell you once. You won't get more emails about this item.</p>`));
  }
  return res.rows.length;
}
