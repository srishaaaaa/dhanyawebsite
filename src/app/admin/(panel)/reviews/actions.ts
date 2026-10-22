"use server";
import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";

const ok = (ids: string[]) => Array.isArray(ids) && ids.length > 0 && ids.length <= 200 && ids.every((x) => /^[0-9a-f-]{36}$/i.test(x));

export async function moderate(ids: string[], action: "approve" | "reject" | "feature" | "unfeature" | "delete") {
  const me = await requireSection("reviews");
  if (!ok(ids)) return { ok: false };
  if (action === "delete") await db.delete(reviews).where(inArray(reviews.id, ids));
  else if (action === "feature" || action === "unfeature") await db.update(reviews).set({ isFeatured: action === "feature", ...(action === "feature" ? { status: "approved" as const } : {}) }).where(inArray(reviews.id, ids));
  else await db.update(reviews).set({ status: action === "approve" ? "approved" : "rejected", ...(action === "reject" ? { isFeatured: false } : {}) }).where(inArray(reviews.id, ids));
  await audit(me.id, `review.${action}`, "review", ids.length === 1 ? ids[0] : null, { count: ids.length });
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}
