import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, userRoles } from "@/db/schema";
import { requireSection, STAFF_SECTIONS } from "@/lib/authz";
import { getSecurity } from "@/lib/security";
import { PageHeader } from "@/components/admin/ui";
import StaffManager from "@/components/admin/StaffManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff and permissions" };

export default async function StaffPage() {
  const me = await requireSection("staff", "admin");
  const [rows, security] = await Promise.all([
    db.select({ id: users.id, email: users.email, name: users.name, role: userRoles.role, permissions: userRoles.permissions, mfa: users.mfaEnabled, since: userRoles.createdAt })
      .from(userRoles).innerJoin(users, eq(users.id, userRoles.userId)).where(ne(userRoles.role, "customer")).orderBy(asc(userRoles.role), asc(users.email)),
    getSecurity(),
  ]);
  return (
    <div>
      <PageHeader title="Staff and permissions" description="Owners manage everything. Admins manage the store and staff. Staff see only the sections you tick (none ticked = all non-admin sections). Changes apply on the next click; removing someone revokes access immediately." />
      <StaffManager me={{ id: me.id, role: me.role }} sections={[...STAFF_SECTIONS]} requireMfa={security.requireStaffMfa}
        rows={rows.map((r) => ({ ...r, role: r.role as "owner" | "admin" | "staff", since: r.since.toISOString() }))} />
    </div>
  );
}
