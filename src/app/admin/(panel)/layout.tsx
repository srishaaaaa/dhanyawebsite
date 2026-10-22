import { signOut } from "@/auth";
import { requireStaff, canAccessSection } from "@/lib/authz";
import { NAV } from "@/components/admin/nav";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // DB-verified on every request. Pages enforce the team MFA policy themselves (so /admin/account stays reachable).
  const me = await requireStaff("staff", { allowWithoutMfa: true });
  const allowed = NAV.filter((n) => n.section && canAccessSection(me, n.section)).map((n) => n.section);
  async function logout() { "use server"; await signOut({ redirectTo: "/admin/login" }); }
  return <AdminShell user={{ name: me.name, email: me.email, role: me.role }} allowed={allowed} logout={logout}>{children}</AdminShell>;
}
