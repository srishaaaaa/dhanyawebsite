"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, userRoles, storeSettings } from "@/db/schema";
import { requireSection, STAFF_SECTIONS, type StaffRole } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { sendEmail, layout, emailConfigured, esc } from "@/lib/email";

type R = { ok: boolean; message: string; tempPassword?: string };
const tempPassword = () => randomBytes(12).toString("base64url"); // 16 chars

const input = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  name: z.string().trim().min(2, "Enter a name").max(100),
  role: z.enum(["staff", "admin", "owner"]),
  permissions: z.array(z.enum(STAFF_SECTIONS)).default([]),
});

/** Who may grant which role: admins manage staff; only owners manage admins and owners. */
function canGrant(actor: StaffRole, target: StaffRole) {
  return actor === "owner" || (actor === "admin" && target === "staff");
}

export async function inviteStaff(raw: unknown): Promise<R> {
  const me = await requireSection("staff", "admin");
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const d = p.data;
  if (!canGrant(me.role, d.role)) return { ok: false, message: "Only the owner can add admins or owners." };
  const [existing] = await db.select({ id: users.id, role: userRoles.role }).from(users).leftJoin(userRoles, eq(userRoles.userId, users.id)).where(eq(users.email, d.email)).limit(1);
  if (existing && existing.role && existing.role !== "customer") return { ok: false, message: "This person is already on the team." };
  const pw = tempPassword();
  const id = existing?.id ?? crypto.randomUUID();
  await db.batch([
    existing
      ? db.update(users).set({ name: d.name, passwordHash: hashPassword(pw), mfaEnabled: false, mfaSecret: null, updatedAt: new Date() }).where(eq(users.id, id))
      : db.insert(users).values({ id, email: d.email, name: d.name, passwordHash: hashPassword(pw) }),
    db.insert(userRoles).values({ userId: id, role: d.role, permissions: d.role === "staff" ? d.permissions : [] })
      .onConflictDoUpdate({ target: userRoles.userId, set: { role: d.role, permissions: d.role === "staff" ? d.permissions : [] } }),
  ]);
  await audit(me.id, "staff.invite", "user", id, { email: d.email, role: d.role, permissions: d.permissions });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (emailConfigured()) {
    await sendEmail(d.email, "You've been added to the DHANYA BOUTIQUE admin", layout("Welcome to the team",
      `<p>Hello ${esc(d.name)}, you now have <strong>${d.role}</strong> access.</p><p>Sign in at <a href="${site}/admin/login">${site}/admin/login</a> with this email. Your temporary password will be shared with you separately — please change it under My account after signing in.</p>`));
  }
  revalidatePath("/admin/staff");
  return { ok: true, message: `Added ${d.email}. Share the temporary password privately (it's shown only once).`, tempPassword: pw };
}

export async function updateStaff(userId: string, role: StaffRole, permissions: string[]): Promise<R> {
  const me = await requireSection("staff", "admin");
  if (userId === me.id) return { ok: false, message: "You can't change your own role." };
  const [cur] = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  if (!cur || cur.role === "customer") return { ok: false, message: "Not a team member." };
  if (!canGrant(me.role, cur.role as StaffRole) || !canGrant(me.role, role)) return { ok: false, message: "Only the owner can change admins or owners." };
  const perms = permissions.filter((x) => (STAFF_SECTIONS as readonly string[]).includes(x));
  if (cur.role === "owner" && role !== "owner") {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(userRoles).where(eq(userRoles.role, "owner"));
    if (n <= 1) return { ok: false, message: "The store must keep at least one owner." };
  }
  await db.update(userRoles).set({ role, permissions: role === "staff" ? perms : [] }).where(eq(userRoles.userId, userId));
  await audit(me.id, "staff.update", "user", userId, { from: cur.role, to: role, permissions: perms });
  revalidatePath("/admin/staff");
  return { ok: true, message: "Access updated. It applies on their next click — no sign-out needed." };
}

/** Removes admin access immediately (the account stays as a customer, so their orders are kept). */
export async function removeStaff(userId: string): Promise<R> {
  const me = await requireSection("staff", "admin");
  if (userId === me.id) return { ok: false, message: "You can't remove yourself." };
  const [cur] = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  if (!cur || cur.role === "customer") return { ok: false, message: "Not a team member." };
  if (!canGrant(me.role, cur.role as StaffRole)) return { ok: false, message: "Only the owner can remove admins or owners." };
  if (cur.role === "owner") {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(userRoles).where(eq(userRoles.role, "owner"));
    if (n <= 1) return { ok: false, message: "The store must keep at least one owner." };
  }
  await db.update(userRoles).set({ role: "customer", permissions: [] }).where(and(eq(userRoles.userId, userId)));
  await audit(me.id, "staff.remove", "user", userId, { role: cur.role });
  revalidatePath("/admin/staff");
  return { ok: true, message: "Access removed." };
}

export async function resetStaffPassword(userId: string): Promise<R> {
  const me = await requireSection("staff", "admin");
  const [cur] = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  if (!cur || cur.role === "customer" || (userId !== me.id && !canGrant(me.role, cur.role as StaffRole))) return { ok: false, message: "Not allowed." };
  const pw = tempPassword();
  await db.update(users).set({ passwordHash: hashPassword(pw), mfaEnabled: false, mfaSecret: null, mfaLastStep: null, updatedAt: new Date() }).where(eq(users.id, userId));
  await audit(me.id, "staff.password_reset", "user", userId);
  return { ok: true, message: "New temporary password created; two-step sign-in was reset. Share it privately.", tempPassword: pw };
}


export async function setRequireMfa(on: boolean): Promise<R> {
  const me = await requireSection("staff", "admin");
  if (me.role !== "owner") return { ok: false, message: "Only the owner can change this." };
  await db.insert(storeSettings).values({ key: "security", value: { requireStaffMfa: on } })
    .onConflictDoUpdate({ target: storeSettings.key, set: { value: { requireStaffMfa: on }, updatedAt: new Date() } });
  await audit(me.id, "security.require_mfa", "settings", "security", { on });
  revalidatePath("/admin", "layout");
  return { ok: true, message: on ? "Two-step sign-in is now required for the whole team." : "Two-step sign-in is optional." };
}
