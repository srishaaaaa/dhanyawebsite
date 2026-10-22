"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import type { BatchItem } from "drizzle-orm/batch";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users, userRoles, addresses, verificationTokens, adminAuditLogs } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getCustomer, requireCustomer, safeNext } from "@/lib/customer";
import { sendEmail, layout, emailConfigured } from "@/lib/email";
import { INDIAN_STATES, MOBILE_RE, PINCODE_RE, normaliseMobile } from "@/lib/india";
import { audit } from "@/lib/audit";

export type State = { ok: boolean; message: string; fields?: Record<string, string> } | null;
const fieldsOf = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [i.path.join("."), i.message]));
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function login(_: State, fd: FormData): Promise<State> {
  const next = safeNext(String(fd.get("next") ?? ""));
  try {
    await signIn("credentials", { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? ""), otp: String(fd.get("otp") ?? ""), redirectTo: next });
    return null;
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      if (code === "mfa_required" || code === "mfa_invalid") return { ok: false, message: "This account uses two-step sign-in. Enter your authenticator code.", fields: { otp: "Required" } };
      return { ok: false, message: "That email and password don't match, or there have been too many attempts. Try again in 15 minutes." };
    }
    throw e; // redirect
  }
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  phone: z.union([z.literal(""), z.string().trim().regex(MOBILE_RE, "Enter a valid 10-digit mobile number")]),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export async function register(_: State, fd: FormData): Promise<State> {
  const parsed = registerSchema.safeParse({ name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone") ?? "", password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldsOf(parsed.error) };
  const d = parsed.data;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email)).limit(1);
  if (exists) return { ok: false, message: "An account with this email already exists. Sign in, or reset your password.", fields: { email: "Already registered" } };
  const id = crypto.randomUUID();
  // Public registration always creates a customer — never staff.
  await db.batch([
    db.insert(users).values({ id, name: d.name, email: d.email, phone: d.phone ? normaliseMobile(d.phone) : null, passwordHash: hashPassword(d.password) }),
    db.insert(userRoles).values({ userId: id, role: "customer" }),
  ]);
  const next = safeNext(String(fd.get("next") ?? ""));
  await signIn("credentials", { email: d.email, password: d.password, redirectTo: next });
  return null;
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function requestReset(_: State, fd: FormData): Promise<State> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const generic: State = { ok: true, message: "If an account exists for that email, we've sent a link to reset the password. It expires in 1 hour." };
  if (!z.string().email().safeParse(email).success) return { ok: false, message: "Enter a valid email address." };
  // Throttle: 3 requests per email per hour.
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(adminAuditLogs).where(and(
    eq(adminAuditLogs.action, "password_reset_requested"), sql`${adminAuditLogs.meta}->>'email' = ${email}`, gt(adminAuditLogs.createdAt, sql`now() - interval '1 hour'`)));
  await audit(null, "password_reset_requested", "auth", null, { email });
  if (n >= 3) return generic;
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!u) return generic;
  const token = randomBytes(32).toString("base64url");
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `reset:${email}`));
  await db.insert(verificationTokens).values({ identifier: `reset:${email}`, token: hashToken(token), expires: new Date(Date.now() + 3600_000) });
  const link = `${SITE}/account/reset?email=${encodeURIComponent(email)}&token=${token}`;
  const sent = await sendEmail(email, "Reset your DHANYA BOUTIQUE password", layout("Reset your password",
    `<p>Use the button below to choose a new password. The link works for one hour.</p><p><a href="${link}" style="background:#30042E;color:#F8F3EB;padding:12px 20px;text-decoration:none;display:inline-block">Choose a new password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`));
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info("[dev] password reset link:", link);
    return { ok: true, message: "Password reset emails aren't set up yet. Please contact us and we'll help you sign in." };
  }
  return sent ? generic : { ok: false, message: "We couldn't send the email just now. Please try again shortly." };
}

export async function resetPassword(_: State, fd: FormData): Promise<State> {
  const email = String(fd.get("email") ?? "").toLowerCase(), token = String(fd.get("token") ?? ""), pw = String(fd.get("password") ?? "");
  if (pw.length < 8) return { ok: false, message: "Use at least 8 characters.", fields: { password: "At least 8 characters" } };
  const [row] = await db.select().from(verificationTokens).where(and(
    eq(verificationTokens.identifier, `reset:${email}`), eq(verificationTokens.token, hashToken(token)), gt(verificationTokens.expires, new Date()))).limit(1);
  if (!row) return { ok: false, message: "This reset link is invalid or has expired. Request a new one." };
  await db.update(users).set({ passwordHash: hashPassword(pw), updatedAt: new Date() }).where(eq(users.email, email));
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `reset:${email}`));
  await audit(null, "password_reset_completed", "auth", null, { email });
  redirect("/account/login?reset=1");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.union([z.literal(""), z.string().trim().regex(MOBILE_RE, "Enter a valid 10-digit mobile number")]),
});
export async function updateProfile(_: State, fd: FormData): Promise<State> {
  const me = await requireCustomer();
  const parsed = profileSchema.safeParse({ name: fd.get("name"), phone: fd.get("phone") ?? "" });
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldsOf(parsed.error) };
  await db.update(users).set({ name: parsed.data.name, phone: parsed.data.phone ? normaliseMobile(parsed.data.phone) : null, updatedAt: new Date() }).where(eq(users.id, me.id));
  revalidatePath("/account");
  return { ok: true, message: "Profile saved." };
}

export async function changePassword(_: State, fd: FormData): Promise<State> {
  const me = await requireCustomer();
  const current = String(fd.get("current") ?? ""), next = String(fd.get("next") ?? "");
  if (next.length < 8) return { ok: false, message: "Use at least 8 characters for the new password.", fields: { next: "At least 8 characters" } };
  const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, me.id)).limit(1);
  if (!verifyPassword(current, u?.hash)) return { ok: false, message: "Your current password isn't right.", fields: { current: "Incorrect" } };
  await db.update(users).set({ passwordHash: hashPassword(next), updatedAt: new Date() }).where(eq(users.id, me.id));
  return { ok: true, message: "Password changed." };
}

const addressSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2, "Enter the full name").max(100),
  phone: z.string().trim().regex(MOBILE_RE, "Enter a valid 10-digit mobile number").transform(normaliseMobile),
  line1: z.string().trim().min(3, "Enter the house / flat and street").max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "Enter the city").max(80),
  state: z.enum(INDIAN_STATES, { errorMap: () => ({ message: "Choose a state" }) }),
  pincode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit PIN code"),
  isDefault: z.boolean(),
});

export async function saveAddress(_: State, fd: FormData): Promise<State> {
  const me = await requireCustomer("/account/addresses");
  const parsed = addressSchema.safeParse({ ...Object.fromEntries(fd), id: fd.get("id") || null, isDefault: fd.get("isDefault") === "on" });
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldsOf(parsed.error) };
  const { id, ...a } = parsed.data;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(addresses).where(eq(addresses.userId, me.id));
  if (!id && n >= 20) return { ok: false, message: "You can save up to 20 addresses." };
  const makeDefault = a.isDefault || n === 0;
  const stmts: BatchItem<"pg">[] = [];
  if (makeDefault) stmts.push(db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, me.id)));
  stmts.push(id
    ? db.update(addresses).set({ ...a, line2: a.line2 || null, isDefault: makeDefault }).where(and(eq(addresses.id, id), eq(addresses.userId, me.id)))
    : db.insert(addresses).values({ ...a, line2: a.line2 || null, userId: me.id, isDefault: makeDefault }));
  await db.batch(stmts as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(id: string) {
  const me = await getCustomer();
  if (!me || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, me.id)));
  revalidatePath("/account/addresses");
}
