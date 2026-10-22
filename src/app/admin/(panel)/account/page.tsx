import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireStaff } from "@/lib/authz";
import { PageHeader } from "@/components/admin/ui";
import StaffAccount from "@/components/admin/StaffAccount";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

export default async function MyAccount({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const me = await requireStaff("staff", { allowWithoutMfa: true });
  const [u] = await db.select({ mfa: users.mfaEnabled }).from(users).where(eq(users.id, me.id)).limit(1);
  const sp = await searchParams;
  return (
    <div>
      <PageHeader title="My account" description={`${me.email} · ${me.role}`} />
      {sp.mfa === "required" && !u?.mfa && <p role="alert" className="mb-6 border border-burgundy/30 bg-rose px-4 py-3 text-sm text-burgundy">Your store requires two-step sign-in for the team. Turn it on below to continue to the admin.</p>}
      <StaffAccount mfaEnabled={Boolean(u?.mfa)} />
    </div>
  );
}
