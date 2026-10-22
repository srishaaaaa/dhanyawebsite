"use server";
import { headers } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { newsletterSubscribers, contactMessages } from "@/db/schema";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

export type FormState = { ok: boolean; message: string } | null;

async function clientIp() {
  try { return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null; } catch { return null; }
}

export async function subscribe(_: FormState, fd: FormData): Promise<FormState> {
  if (fd.get("company")) return { ok: true, message: "Thank you — you're on the list." }; // honeypot
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254), consent: z.literal("on") })
    .safeParse({ email: fd.get("email"), consent: fd.get("consent") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue.path[0] === "consent" ? "Please tick the box to agree to receive emails." : "Enter a valid email address." };
  }
  try {
    await db.insert(newsletterSubscribers).values({ email: parsed.data.email })
      .onConflictDoUpdate({ target: newsletterSubscribers.email, set: { isActive: true, consentAt: new Date(), unsubscribedAt: null } });
    return { ok: true, message: "Thank you — you're on the list. Expect new arrivals and private previews, never spam." };
  } catch (e) {
    console.error("newsletter", e);
    return { ok: false, message: "We couldn't save your email just now. Please try again in a moment." };
  }
}

const contact = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(4000),
});

export async function sendContact(_: FormState, fd: FormData): Promise<FormState> {
  if (fd.get("company")) return { ok: true, message: "Thank you — we'll reply within one working day." };
  const parsed = contact.safeParse({ name: fd.get("name"), email: fd.get("email"), message: fd.get("message") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ip = await clientIp();
  try {
    if (ip) {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(contactMessages)
        .where(and(eq(contactMessages.ip, ip), gt(contactMessages.createdAt, sql`now() - interval '1 hour'`)));
      if (n >= 5) return { ok: false, message: "You've sent several messages recently. Please wait an hour, or email us directly." };
    }
    await db.insert(contactMessages).values({ ...parsed.data, ip });
    return { ok: true, message: "Thank you — your message has reached us. We reply within one working day." };
  } catch (e) {
    console.error("contact", e);
    return { ok: false, message: "Your message couldn't be sent just now. Please try again, or email us directly." };
  }
}

export async function unsubscribe(email: string, sig: string) {
  if (!verifyUnsubscribe(email, sig)) return { ok: false, message: "This link isn't valid." };
  await db.update(newsletterSubscribers).set({ isActive: false, unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.email, email.toLowerCase()));
  return { ok: true, message: "You've been unsubscribed. We're sorry to see you go." };
}
