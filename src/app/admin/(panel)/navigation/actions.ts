"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { navigationMenus } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";

const items = z.array(z.object({
  label: z.string().trim().min(1, "Add a label").max(40),
  href: z.string().trim().max(300).refine((v) => v.startsWith("/") || v.startsWith("https://"), "Use /path or https:// link"),
})).max(10, "Up to 10 links");

export async function saveMenu(location: "header" | "footer", raw: unknown) {
  const me = await requireSection("navigation", "admin");
  if (location !== "header" && location !== "footer") return { ok: false, message: "Unknown menu." };
  const p = items.safeParse(raw);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  await db.insert(navigationMenus).values({ location, items: p.data })
    .onConflictDoUpdate({ target: navigationMenus.location, set: { items: p.data, updatedAt: new Date() } });
  await audit(me.id, "navigation.update", "navigation", location, { count: p.data.length });
  revalidatePath("/", "layout");
  return { ok: true, message: p.data.length ? "Menu saved." : "Menu cleared — defaults will be used." };
}
