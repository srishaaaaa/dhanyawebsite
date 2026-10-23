"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { INDIAN_STATES, MOBILE_RE } from "@/lib/india";
import type { SettingKey } from "@/lib/settings";

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const https = z.union([z.literal(""), z.undefined(), z.string().trim().url().refine((u) => u.startsWith("https://"), "Use an https:// link")]).transform((v) => v || undefined);
const money = z.coerce.number().min(0).max(1_000_000);
const optMoney = z.union([z.literal(""), z.null(), z.undefined(), money]).transform((v) => (v === "" || v == null ? null : v));
const bool = z.union([z.boolean(), z.literal("on"), z.literal(""), z.undefined()]).transform((v) => v === true || v === "on");

const SCHEMAS = {
  store: z.object({
    name: z.string().trim().min(2).max(80), email: z.union([z.literal(""), z.string().email()]).transform((v) => v || undefined),
    phone: text(20), whatsapp: z.union([z.literal(""), z.undefined(), z.string().regex(MOBILE_RE, "10-digit mobile number")]).transform((v) => v || undefined),
    address: text(400), announcement: text(160), hours: text(80),
    openFrom: z.union([z.literal(""), z.undefined(), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM, like 10:00")]).transform((v) => v || undefined),
    openTo: z.union([z.literal(""), z.undefined(), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM, like 20:00")]).transform((v) => v || undefined),
    "social.instagram": https, "social.facebook": https, "social.pinterest": https, "social.youtube": https,
    currency: z.literal("INR").default("INR"), timezone: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
  }),
  shipping: z.object({
    flatFee: money, freeShippingThreshold: optMoney, expressFee: optMoney, deliveryDays: text(20), expressDays: text(20),
    taxOnDelivery: bool, deliveryGstRate: z.coerce.number().min(0).max(28).default(18), returnWindowDays: z.coerce.number().int().min(0).max(60).default(7),
  }),
  tax: z.object({
    legalName: text(150), address: text(400),
    gstin: z.union([z.literal(""), z.undefined(), z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN")]).transform((v) => v || undefined),
    state: z.union([z.literal(""), z.enum(INDIAN_STATES)]).transform((v) => v || undefined),
    invoicePrefix: z.string().trim().regex(/^[A-Za-z0-9-]{1,8}$/, "1–8 letters, numbers or -").default("DB"),
  }),
  payments: z.object({ codEnabled: bool, onlineEnabled: bool, codMaxOrder: optMoney }),
  brand: z.object({
    logoUrl: https, logoAlt: text(80), faviconUrl: https,
    serif: z.enum(["cormorant", "playfair"]).default("cormorant"), sans: z.enum(["manrope", "inter"]).default("manrope"),
    ...Object.fromEntries(["aubergine", "burgundy", "ivory", "gold", "rose", "charcoal"].map((k) => [`colors.${k}`, z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #30042E")])),
  }),
  maintenance: z.object({ enabled: bool, message: text(300) }),
} satisfies Record<SettingKey | "brand" | "maintenance", z.ZodTypeAny>;

function unflatten(o: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    const [a, b] = k.split(".");
    if (b) out[a] = { ...((out[a] as object) ?? {}), [b]: v }; else out[a] = v;
  }
  return out;
}

export async function saveSettings(key: SettingKey | "brand" | "maintenance", raw: Record<string, unknown>) {
  const me = await requireSection("settings", "admin");
  const schema = SCHEMAS[key];
  if (!schema) return { ok: false, message: "Unknown settings." };
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, message: "Please fix the highlighted fields.", fields: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])) };
  const value = unflatten(p.data as Record<string, unknown>);
  await db.insert(storeSettings).values({ key, value }).onConflictDoUpdate({ target: storeSettings.key, set: { value, updatedAt: new Date() } });
  await audit(me.id, `settings.${key}`, "settings", key);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. The storefront uses the new settings right away." };
}
