"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register, requestReset, resetPassword, updateProfile, changePassword, saveAddress, deleteAddress, type State } from "@/app/(store)/account/actions";
import { INDIAN_STATES } from "@/lib/india";

const input = "mt-1 w-full border-b border-charcoal/30 bg-transparent py-2 outline-none focus:border-aubergine";
function F({ label, name, type = "text", state, ...rest }: { label: string; name: string; type?: string; state: State } & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = state?.fields?.[name];
  return (
    <label className="block text-sm">{label}
      <input name={name} type={type} aria-invalid={Boolean(err)} className={input} {...rest} />
      {err && <span className="mt-1 block text-xs text-burgundy">{err}</span>}
    </label>
  );
}
const Msg = ({ s }: { s: State }) => (s ? <p role={s.ok ? "status" : "alert"} className={`text-sm ${s.ok ? "text-emerald-800" : "text-burgundy"}`}>{s.message}</p> : null);

export function LoginForm({ next, reset }: { next: string; reset?: boolean }) {
  const [s, act, pending] = useActionState(login, null);
  return (
    <form action={act} className="space-y-6">
      {reset && <p role="status" className="text-sm text-emerald-800">Password updated. Sign in with your new password.</p>}
      <input type="hidden" name="next" value={next} />
      <F label="Email" name="email" type="email" autoComplete="email" required state={s} />
      <F label="Password" name="password" type="password" autoComplete="current-password" required state={s} />
      {s?.fields?.otp && <F label="Authenticator code" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} state={s} />}
      <Msg s={s} />
      <button disabled={pending} className="btn-primary w-full">{pending ? "Signing in…" : "SIGN IN"}</button>
      <div className="flex justify-between text-sm"><Link href="/account/forgot" className="underline">Forgot password?</Link><Link href={`/account/register?next=${encodeURIComponent(next)}`} className="underline">Create an account</Link></div>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [s, act, pending] = useActionState(register, null);
  return (
    <form action={act} className="space-y-6">
      <input type="hidden" name="next" value={next} />
      <F label="Full name" name="name" autoComplete="name" required state={s} />
      <F label="Email" name="email" type="email" autoComplete="email" required state={s} />
      <F label="Mobile (optional)" name="phone" type="tel" autoComplete="tel" inputMode="tel" state={s} />
      <F label="Password (8+ characters)" name="password" type="password" autoComplete="new-password" minLength={8} required state={s} />
      <Msg s={s} />
      <button disabled={pending} className="btn-primary w-full">{pending ? "Creating account…" : "CREATE ACCOUNT"}</button>
      <p className="text-sm">Already have an account? <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [s, act, pending] = useActionState(requestReset, null);
  if (s?.ok) return <p role="status" className="font-serif text-2xl">{s.message}</p>;
  return (
    <form action={act} className="space-y-6">
      <F label="Email" name="email" type="email" autoComplete="email" required state={s} />
      <Msg s={s} />
      <button disabled={pending} className="btn-primary w-full">{pending ? "Sending…" : "SEND RESET LINK"}</button>
    </form>
  );
}

export function ResetForm({ email, token }: { email: string; token: string }) {
  const [s, act, pending] = useActionState(resetPassword, null);
  return (
    <form action={act} className="space-y-6">
      <input type="hidden" name="email" value={email} /><input type="hidden" name="token" value={token} />
      <F label="New password (8+ characters)" name="password" type="password" autoComplete="new-password" minLength={8} required state={s} />
      <Msg s={s} />
      <button disabled={pending} className="btn-primary w-full">{pending ? "Saving…" : "SET NEW PASSWORD"}</button>
    </form>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [s, act, pending] = useActionState(updateProfile, null);
  return (
    <form action={act} className="space-y-6">
      <p className="text-sm text-charcoal/60">Email: {email}</p>
      <F label="Full name" name="name" defaultValue={name} required state={s} />
      <F label="Mobile" name="phone" type="tel" defaultValue={phone} state={s} />
      <Msg s={s} />
      <button disabled={pending} className="btn-outline">{pending ? "Saving…" : "SAVE PROFILE"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [s, act, pending] = useActionState(changePassword, null);
  return (
    <form action={act} className="space-y-6">
      <F label="Current password" name="current" type="password" autoComplete="current-password" required state={s} />
      <F label="New password" name="next" type="password" autoComplete="new-password" minLength={8} required state={s} />
      <Msg s={s} />
      <button disabled={pending} className="btn-outline">{pending ? "Saving…" : "CHANGE PASSWORD"}</button>
    </form>
  );
}

export type Addr = { id: string; fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; isDefault: boolean };

export function AddressForm({ a, onDone }: { a?: Addr; onDone?: () => void }) {
  const [s, act, pending] = useActionState(async (prev: State, fd: FormData) => { const r = await saveAddress(prev, fd); if (r?.ok) onDone?.(); return r; }, null);
  return (
    <form action={act} className="grid gap-5 sm:grid-cols-2">
      {a && <input type="hidden" name="id" value={a.id} />}
      <F label="Full name" name="fullName" defaultValue={a?.fullName} autoComplete="name" required state={s} />
      <F label="Mobile" name="phone" type="tel" defaultValue={a?.phone} autoComplete="tel" required state={s} />
      <div className="sm:col-span-2"><F label="House / flat, street" name="line1" defaultValue={a?.line1} autoComplete="address-line1" required state={s} /></div>
      <div className="sm:col-span-2"><F label="Area, landmark (optional)" name="line2" defaultValue={a?.line2 ?? ""} autoComplete="address-line2" state={s} /></div>
      <F label="City" name="city" defaultValue={a?.city} autoComplete="address-level2" required state={s} />
      <F label="PIN code" name="pincode" inputMode="numeric" maxLength={6} defaultValue={a?.pincode} autoComplete="postal-code" required state={s} />
      <label className="block text-sm">State
        <select name="state" defaultValue={a?.state ?? ""} required className={input}><option value="" disabled>Choose…</option>{INDIAN_STATES.map((x) => <option key={x}>{x}</option>)}</select>
        {s?.fields?.state && <span className="mt-1 block text-xs text-burgundy">{s.fields.state}</span>}
      </label>
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isDefault" defaultChecked={a?.isDefault} className="accent-aubergine" />Default address</label>
      <div className="sm:col-span-2 flex items-center gap-4"><button disabled={pending} className="btn-primary">{pending ? "Saving…" : "SAVE ADDRESS"}</button><Msg s={s} /></div>
    </form>
  );
}

export function AddressBook({ list }: { list: Addr[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(list.length ? null : "new");
  return (
    <div className="space-y-8">
      <ul className="grid gap-6 sm:grid-cols-2">
        {list.map((a) => (
          <li key={a.id} className="border border-charcoal/15 bg-white p-6 text-sm">
            {editing === a.id ? <AddressForm a={a} onDone={() => setEditing(null)} /> : (
              <>
                <p className="font-serif text-xl">{a.fullName} {a.isDefault && <span className="ml-2 align-middle text-xs text-burgundy">Default</span>}</p>
                <p className="mt-2 leading-relaxed text-charcoal/75">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
                <div className="mt-4 flex gap-4"><button onClick={() => setEditing(a.id)} className="underline">Edit</button>
                  <button onClick={() => { if (confirm("Delete this address?")) deleteAddress(a.id); }} className="underline text-burgundy">Delete</button></div>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? <div className="border border-charcoal/15 bg-white p-6"><h2 className="font-serif text-2xl mb-6">New address</h2><AddressForm onDone={() => setEditing(null)} /></div>
        : <button onClick={() => setEditing("new")} className="btn-outline">ADD AN ADDRESS</button>}
    </div>
  );
}
