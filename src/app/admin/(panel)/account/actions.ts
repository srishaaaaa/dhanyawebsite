"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireStaff } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { newSecret, verifyTotp, otpauthUri } from "@/lib/totp";

type R = { ok: boolean; message: string; secret?: string; uri?: string };

export async function changeStaffPassword(current: string, next: string): Promise<R> {
  const me = await requireStaff("staff", { allowWithoutMfa: true });
  if (next.length < 12) return { ok: false, message: "Staff passwords need at least 12 characters." };
  const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, me.id)).limit(1);
  if (!verifyPassword(current, u?.hash)) return { ok: false, message: "Your current password isn't right." };
  await db.update(users).set({ passwordHash: hashPassword(next), updatedAt: new Date() }).where(eq(users.id, me.id));
  await audit(me.id, "staff.password_changed", "user", me.id);
  return { ok: true, message: "Password changed." };
}

/** Step 1: generate a secret (stored, not yet enabled) and return it for the authenticator app. */
export async function startMfa(): Promise<R> {
  const me = await requireStaff("staff", { allowWithoutMfa: true });
  const secret = newSecret();
  await db.update(users).set({ mfaSecret: secret, mfaEnabled: false, mfaLastStep: null }).where(eq(users.id, me.id));
  return { ok: true, message: "Scan or enter the key in your authenticator app, then type the 6-digit code.", secret, uri: otpauthUri(secret, me.email) };
}

/** Step 2: confirm with a code from the app. */
export async function confirmMfa(code: string): Promise<R> {
  const me = await requireStaff("staff", { allowWithoutMfa: true });
  const [u] = await db.select({ secret: users.mfaSecret }).from(users).where(eq(users.id, me.id)).limit(1);
  const step = u?.secret ? verifyTotp(u.secret, code) : null;
  if (step === null) return { ok: false, message: "That code didn't match. Check your phone's clock and try the newest code." };
  await db.update(users).set({ mfaEnabled: true, mfaLastStep: step }).where(eq(users.id, me.id));
  await audit(me.id, "staff.mfa_enabled", "user", me.id);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Two-step sign-in is on. You'll be asked for a code each time you sign in." };
}

export async function disableMfa(code: string): Promise<R> {
  const me = await requireStaff("staff", { allowWithoutMfa: true });
  const [u] = await db.select({ secret: users.mfaSecret, enabled: users.mfaEnabled }).from(users).where(eq(users.id, me.id)).limit(1);
  if (!u?.enabled || !u.secret || verifyTotp(u.secret, code) === null) return { ok: false, message: "Enter a current code from your authenticator app to turn this off." };
  await db.update(users).set({ mfaEnabled: false, mfaSecret: null, mfaLastStep: null }).where(eq(users.id, me.id));
  await audit(me.id, "staff.mfa_disabled", "user", me.id);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Two-step sign-in is off." };
}
