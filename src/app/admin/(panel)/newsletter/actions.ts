"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";

export async function setSubscribed(id: string, active: boolean) {
  const me = await requireSection("newsletter");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await db.update(newsletterSubscribers).set({ isActive: active, unsubscribedAt: active ? null : new Date() }).where(eq(newsletterSubscribers.id, id));
  await audit(me.id, active ? "newsletter.resubscribe" : "newsletter.unsubscribe", "newsletter", id);
  revalidatePath("/admin/newsletter");
}
