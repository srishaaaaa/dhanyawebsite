import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { verifyUnsubscribe } from "@/lib/unsubscribe";
import { UnsubscribeButton } from "@/components/store/Unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

// Two-step (GET shows a button, POST unsubscribes) so link scanners in mail clients can't unsubscribe people by accident.
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ e?: string; s?: string }> }) {
  const { e, s } = await searchParams;
  const valid = Boolean(e && s && verifyUnsubscribe(e, s));
  const [row] = valid ? await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, e!.toLowerCase())).limit(1) : [];
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-20 text-center">
      <div className="max-w-md">
        <h1 className="display text-5xl">Newsletter</h1>
        {!valid || !row ? <p className="mt-6 text-charcoal/70">This link isn&apos;t valid. If you keep receiving emails you didn&apos;t ask for, <Link href="/contact" className="underline">contact us</Link>.</p>
          : !row.isActive ? <p className="mt-6 text-charcoal/70">{row.email} is unsubscribed. You won&apos;t receive newsletters from us.</p>
          : <><p className="mt-6 text-charcoal/70">Stop sending newsletters to <strong>{row.email}</strong>? Order emails are not affected.</p><UnsubscribeButton email={e!} sig={s!} /></>}
      </div>
    </div>
  );
}
