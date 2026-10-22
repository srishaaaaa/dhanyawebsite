import { notFound, redirect } from "next/navigation";
import { requireStaff, canAccessSection } from "@/lib/authz";
import { NAV, PHASE } from "@/components/admin/nav";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = NAV.find((n) => n.section === section);
  if (!item || section === "audit-logs") notFound();
  const me = await requireStaff();
  if (!canAccessSection(me, section)) redirect("/admin/unauthorized");
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl text-aubergine">{item.label}</h1>
      <p className="text-charcoal/70">This module is built in Phase {PHASE[section] ?? "later"}. Access control is already enforced.</p>
    </div>
  );
}
