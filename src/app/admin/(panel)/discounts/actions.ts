"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coupons, couponRedemptions } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { fieldErrors } from "@/lib/catalog/validation";
import { friendlyDbError } from "@/lib/db-errors";

const optNum = z.union([z.literal(""), z.null(), z.undefined(), z.coerce.number().min(0)]).transform((v) => (v === "" || v == null ? null : v));
const optInt = z.union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int().min(1)]).transform((v) => (v === "" || v == null ? null : v));
const optDate = z.union([z.literal(""), z.null(), z.undefined(), z.string()]).transform((v) => (v ? new Date(`${v}:00+05:30`) : null));

const couponInput = z.object({
  id: z.string().uuid().optional().nullable(),
  code: z.string().trim().toUpperCase().min(3, "At least 3 characters").max(30).regex(/^[A-Z0-9_-]+$/, "Letters, numbers, - and _ only"),
  description: z.string().trim().max(200).optional().nullable(),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().positive("Enter a value"),
  minOrderValue: optNum, maxDiscount: optNum, usageLimit: optInt, perCustomerLimit: optInt,
  productIds: z.array(z.string().uuid()).max(200).default([]), collectionIds: z.array(z.string().uuid()).max(50).default([]),
  startsAt: optDate, expiresAt: optDate, isActive: z.boolean(),
}).superRefine((c, ctx) => {
  if (c.type === "percentage" && c.value > 90) ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage can be at most 90" });
  if (c.startsAt && c.expiresAt && c.expiresAt <= c.startsAt) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Must be after the start" });
});

export async function saveCoupon(raw: unknown) {
  const me = await requireSection("discounts");
  const p = couponInput.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "Please fix the highlighted fields.", fields: fieldErrors(p.error) };
  const { id, ...d } = p.data;
  const row = { ...d, value: d.value.toFixed(2), minOrderValue: d.minOrderValue?.toFixed(2) ?? null, maxDiscount: d.maxDiscount?.toFixed(2) ?? null,
    productIds: d.productIds.length ? d.productIds : null, collectionIds: d.collectionIds.length ? d.collectionIds : null, description: d.description || null };
  try {
    if (id) await db.update(coupons).set(row).where(eq(coupons.id, id));
    else await db.insert(coupons).values(row);
  } catch (e) {
    const m = friendlyDbError(e);
    return { ok: false as const, error: m?.includes("already") ? "A coupon with this code already exists." : m ?? "Couldn't save the coupon.", fields: m?.includes("already") ? { code: "Already exists" } : undefined };
  }
  await audit(me.id, id ? "coupon.update" : "coupon.create", "coupon", id ?? d.code, { code: d.code });
  revalidatePath("/admin/discounts");
  return { ok: true as const };
}

export async function deleteCoupon(id: string) {
  const me = await requireSection("discounts", "admin");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(couponRedemptions).where(eq(couponRedemptions.couponId, id));
  if (n > 0) {
    await db.update(coupons).set({ isActive: false }).where(eq(coupons.id, id));
    await audit(me.id, "coupon.deactivate", "coupon", id);
    revalidatePath("/admin/discounts");
    return { ok: true, message: "This code has been used, so it was deactivated instead of deleted." };
  }
  await db.delete(coupons).where(eq(coupons.id, id));
  await audit(me.id, "coupon.delete", "coupon", id);
  revalidatePath("/admin/discounts");
  return { ok: true, message: "Deleted." };
}
