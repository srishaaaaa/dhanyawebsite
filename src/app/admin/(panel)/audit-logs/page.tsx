import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLogs, users } from "@/db/schema";
import { requireStaff } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AuditLogs() {
  await requireStaff("admin");
  const rows = await db
    .select({ at: adminAuditLogs.createdAt, action: adminAuditLogs.action, entity: adminAuditLogs.entity,
      entityId: adminAuditLogs.entityId, ip: adminAuditLogs.ip, meta: adminAuditLogs.meta, actor: users.email })
    .from(adminAuditLogs).leftJoin(users, eq(users.id, adminAuditLogs.actorId))
    .orderBy(desc(adminAuditLogs.createdAt)).limit(100);
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl text-aubergine">Audit Logs</h1>
      <div className="overflow-x-auto bg-white border border-charcoal/10">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-charcoal/60">
            <tr>{["Time", "Actor", "Action", "Entity", "IP"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-charcoal/50">No events yet.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-charcoal/10">
                <td className="p-3 whitespace-nowrap">{r.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="p-3">{r.actor ?? (r.meta as { email?: string } | null)?.email ?? "—"}</td>
                <td className="p-3">{r.action}</td>
                <td className="p-3">{r.entity}{r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}</td>
                <td className="p-3">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
