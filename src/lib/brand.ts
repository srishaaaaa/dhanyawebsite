import "server-only";
import { cache } from "react";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";

export const DEFAULT_COLORS = { aubergine: "#30042E", burgundy: "#54162F", ivory: "#F8F3EB", gold: "#C8A66A", rose: "#E8D5D5", charcoal: "#211D20" };
export type BrandColors = typeof DEFAULT_COLORS;
export type Brand = {
  logoUrl?: string; logoAlt?: string; faviconUrl?: string;
  colors: BrandColors; serif: "cormorant" | "playfair"; sans: "manrope" | "inter";
};
export type Maintenance = { enabled: boolean; message?: string };

export const getBrand = cache(async (): Promise<{ brand: Brand; maintenance: Maintenance }> => {
  const fallback = { brand: { colors: DEFAULT_COLORS, serif: "cormorant", sans: "manrope" } as Brand, maintenance: { enabled: false } };
  try {
    const rows = await db.select().from(storeSettings).where(inArray(storeSettings.key, ["brand", "maintenance"]));
    const b = rows.find((r) => r.key === "brand")?.value as Partial<Brand> | undefined;
    const m = rows.find((r) => r.key === "maintenance")?.value as Partial<Maintenance> | undefined;
    return {
      brand: { ...fallback.brand, ...b, colors: { ...DEFAULT_COLORS, ...(b?.colors ?? {}) } },
      maintenance: { enabled: false, ...m },
    };
  } catch { return fallback; }
});

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** CSS custom properties for the palette: hex for plain CSS, RGB triplets for Tailwind opacity modifiers. */
export function brandVars(c: BrandColors): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(c)) {
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) continue;
    out[`--${k}`] = v;
    out[`--c-${k}`] = rgb(v);
  }
  return out;
}
