import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { userRoles, users } from "@/db/schema";
import { getSecurity } from "@/lib/security";

export type StaffRole = "owner" | "admin" | "staff";
const RANK: Record<string, number> = { customer: 0, staff: 1, admin: 2, owner: 3 };

// Sections only owner/admin may open. Staff get the rest (optionally narrowed by per-person permissions).
export const ADMIN_ONLY = ["staff", "settings", "payments", "taxes", "shipping", "analytics", "audit-logs", "navigation"];
// Sections a staff member can be granted. An empty permission list means "all staff sections".
export const STAFF_SECTIONS = ["products", "categories", "collections", "inventory", "orders", "customers", "discounts", "homepage", "campaigns", "reviews", "pages", "newsletter"] as const;

export type Staff = { id: string; role: StaffRole; email: string; name: string | null; permissions: string[]; mfaEnabled: boolean };

async function load(): Promise<Staff | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [row] = await db
    .select({ role: userRoles.role, permissions: userRoles.permissions, email: users.email, name: users.name, mfaEnabled: users.mfaEnabled })
    .from(userRoles).innerJoin(users, eq(users.id, userRoles.userId))
    .where(eq(userRoles.userId, session.user.id)).limit(1);
  if (!row || RANK[row.role] < RANK.staff) return null;
  return { id: session.user.id, role: row.role as StaffRole, email: row.email, name: row.name, permissions: row.permissions ?? [], mfaEnabled: row.mfaEnabled };
}

/** Server-side gate. Role is read from the DB on every call — never from the JWT/client. */
export async function requireStaff(minRole: StaffRole = "staff", opts: { allowWithoutMfa?: boolean } = {}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  const me = await load();
  if (!me || RANK[me.role] < RANK[minRole]) redirect("/admin/unauthorized");
  if (!opts.allowWithoutMfa && !me.mfaEnabled && (await getSecurity()).requireStaffMfa) redirect("/admin/account?mfa=required");
  return me;
}

/** Like requireStaff, plus the per-section permission check. Use on every admin page and server action. */
export async function requireSection(section: string, minRole: StaffRole = "staff") {
  const me = await requireStaff(minRole);
  if (!canAccessSection(me, section)) redirect("/admin/unauthorized");
  return me;
}

/** Non-redirecting variant for storefront previews and route handlers. Returns null if not staff (or lacks the section). */
export async function getStaff(minRole: StaffRole = "staff", section?: string) {
  const me = await load().catch(() => null);
  if (!me || RANK[me.role] < RANK[minRole]) return null;
  if (section && !canAccessSection(me, section)) return null;
  return me;
}

export function canAccessSection(me: Pick<Staff, "role" | "permissions">, section: string) {
  if (RANK[me.role] >= RANK.admin) return true;
  if (ADMIN_ONLY.includes(section)) return false;
  return me.permissions.length === 0 || me.permissions.includes(section);
}

export function hasRole(role: StaffRole, min: StaffRole) {
  return RANK[role] >= RANK[min];
}
