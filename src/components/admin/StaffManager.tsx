"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteStaff, updateStaff, removeStaff, resetStaffPassword, setRequireMfa } from "@/app/admin/(panel)/staff/actions";
import { Card, Field, inputCls, btn, Badge } from "./ui";

type Role = "owner" | "admin" | "staff";
type Row = { id: string; email: string; name: string | null; role: Role; permissions: string[]; mfa: boolean; since: string };
const LABEL: Record<string, string> = { products: "Products", categories: "Categories", collections: "Collections", inventory: "Inventory", orders: "Orders", customers: "Customers", discounts: "Discounts", homepage: "Homepage", campaigns: "Campaigns", reviews: "Reviews", pages: "Pages", newsletter: "Newsletter" };

export default function StaffManager({ rows, me, sections, requireMfa }: { rows: Row[]; me: { id: string; role: Role }; sections: string[]; requireMfa: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string; tempPassword?: string } | null>(null);
  const [edit, setEdit] = useState<{ id: string; role: Role; permissions: string[] } | null>(null);
  const [inv, setInv] = useState({ email: "", name: "", role: "staff" as Role, permissions: [] as string[] });
  const canTouch = (r: Role) => me.role === "owner" || (me.role === "admin" && r === "staff");
  const run = (fn: () => Promise<{ ok: boolean; message: string; tempPassword?: string }>) => start(async () => { const r = await fn(); setMsg(r); if (r.ok) router.refresh(); });

  const Perms = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
    <fieldset className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
      <legend className="mb-1 text-xs text-charcoal/60">Sections (none ticked = all non-admin sections)</legend>
      {sections.map((s) => <label key={s} className="flex items-center gap-2"><input type="checkbox" checked={value.includes(s)} onChange={(e) => onChange(e.target.checked ? [...value, s] : value.filter((x) => x !== s))} />{LABEL[s] ?? s}</label>)}
    </fieldset>
  );

  return (
    <div className="space-y-6">
      {msg && (
        <div role="status" className={`border px-4 py-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50" : "border-burgundy/30 bg-rose text-burgundy"}`}>
          {msg.message}
          {msg.tempPassword && <p className="mt-2">Temporary password: <code className="select-all bg-white px-2 py-0.5 font-mono">{msg.tempPassword}</code> — it won&apos;t be shown again.</p>}
        </div>
      )}
      <div className="overflow-x-auto border border-charcoal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal/10 text-left text-xs text-charcoal/60"><tr><th className="p-3">Person</th><th className="p-3">Role</th><th className="p-3">Access</th><th className="p-3">Two-step</th><th /></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-charcoal/10 align-top">
              <td className="p-3">{r.name ?? "—"}{r.id === me.id && <span className="ml-1 text-xs text-charcoal/50">(you)</span>}<span className="block text-xs text-charcoal/55">{r.email}</span></td>
              <td className="p-3 capitalize">{r.role}</td>
              <td className="p-3">
                {edit?.id === r.id ? (
                  <div className="space-y-2">
                    <select className={`${inputCls} mt-0 w-36`} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>
                      <option value="staff">Staff</option>{me.role === "owner" && <><option value="admin">Admin</option><option value="owner">Owner</option></>}
                    </select>
                    {edit.role === "staff" && <Perms value={edit.permissions} onChange={(p) => setEdit({ ...edit, permissions: p })} />}
                    <div className="flex gap-2"><button disabled={pending} className={btn.primary} onClick={() => run(async () => { const x = await updateStaff(r.id, edit.role, edit.permissions); if (x.ok) setEdit(null); return x; })}>Save</button><button className={btn.secondary} onClick={() => setEdit(null)}>Cancel</button></div>
                  </div>
                ) : r.role === "staff" ? (r.permissions.length ? r.permissions.map((p) => LABEL[p] ?? p).join(", ") : "All staff sections") : "Everything"}
              </td>
              <td className="p-3">{r.mfa ? <Badge tone="ok">On</Badge> : <Badge tone={requireMfa ? "out" : "muted"}>Off</Badge>}</td>
              <td className="p-3 text-right whitespace-nowrap">
                {r.id !== me.id && canTouch(r.role) && edit?.id !== r.id && <>
                  <button className={btn.ghost} onClick={() => setEdit({ id: r.id, role: r.role, permissions: r.permissions })}>Edit</button>
                  <button className="ml-3 text-xs underline" onClick={() => { if (confirm(`Create a new temporary password for ${r.email}? Their current password and two-step setup stop working.`)) run(() => resetStaffPassword(r.id)); }}>Reset password</button>
                  <button className="ml-3 text-xs text-burgundy underline" onClick={() => { if (confirm(`Remove ${r.email} from the team? Access ends immediately.`)) run(() => removeStaff(r.id)); }}>Remove</button>
                </>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Add a team member">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await inviteStaff(inv); if (r.ok) setInv({ email: "", name: "", role: "staff", permissions: [] }); return r; }); }}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><input className={inputCls} value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className={inputCls} value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} /></Field>
            </div>
            <Field label="Role"><select className={inputCls} value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Role })}><option value="staff">Staff</option>{me.role === "owner" && <><option value="admin">Admin</option><option value="owner">Owner</option></>}</select></Field>
            {inv.role === "staff" && <Perms value={inv.permissions} onChange={(p) => setInv({ ...inv, permissions: p })} />}
            <p className="text-xs text-charcoal/55">A temporary password is generated and shown once. Ask them to change it under My account and turn on two-step sign-in.</p>
            <button disabled={pending} className={btn.primary}>Add to team</button>
          </form>
        </Card>
        <Card title="Team security">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={requireMfa} disabled={me.role !== "owner" || pending} onChange={(e) => run(() => setRequireMfa(e.target.checked))} />
            <span>Require two-step sign-in for everyone on the team<span className="block text-xs text-charcoal/55">Members without it are sent to My account to set it up before they can use the admin.{me.role !== "owner" && " Only the owner can change this."}</span></span>
          </label>
        </Card>
      </div>
    </div>
  );
}
