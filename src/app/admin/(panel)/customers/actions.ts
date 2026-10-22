"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireSection } from "@/lib/authz";

export async function markMessageRead(id: string) {
  await requireSection("customers");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await db.update(contactMessages).set({ isRead: true }).where(eq(contactMessages.id, id));
}
