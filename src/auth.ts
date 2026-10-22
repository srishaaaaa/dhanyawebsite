import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, adminAuditLogs } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { verifyTotp } from "@/lib/totp";
import { authConfig } from "./auth.config";
import { audit } from "@/lib/audit";

const creds = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200), otp: z.string().max(10).optional() });
const MAX_FAILS = 5;
const WINDOW_MIN = 15;

/** Surfaced to the login form as error.code so it can ask for the authenticator code. */
class MfaRequired extends CredentialsSignin { code = "mfa_required"; }
class MfaInvalid extends CredentialsSignin { code = "mfa_invalid"; }

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(raw) {
        const parsed = creds.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        // Rate limit: failed attempts per email in the last WINDOW_MIN minutes.
        const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(adminAuditLogs).where(and(
          eq(adminAuditLogs.action, "login_failed"),
          sql`${adminAuditLogs.meta}->>'email' = ${email}`,
          gt(adminAuditLogs.createdAt, sql`now() - (${WINDOW_MIN} || ' minutes')::interval`),
        ));
        if (n >= MAX_FAILS) return null;

        const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const ok = verifyPassword(parsed.data.password, u?.passwordHash);
        if (!u || !ok) {
          await audit(u?.id ?? null, "login_failed", "auth", null, { email });
          return null;
        }
        if (u.mfaEnabled && u.mfaSecret) {
          const otp = parsed.data.otp?.trim();
          if (!otp) throw new MfaRequired();
          const step = verifyTotp(u.mfaSecret, otp);
          // Accept each code once: the step must be newer than the last one used (atomic, so parallel replays fail too).
          const accepted = step !== null && (await db.update(users).set({ mfaLastStep: step })
            .where(and(eq(users.id, u.id), or(isNull(users.mfaLastStep), lt(users.mfaLastStep, step)))).returning({ id: users.id })).length === 1;
          if (!accepted) {
            await audit(u.id, "login_failed", "auth", null, { email, reason: "mfa" });
            throw new MfaInvalid();
          }
        }
        await audit(u.id, "login_success", "auth", u.id);
        return { id: u.id, email: u.email, name: u.name };
      },
    }),
  ],
});
