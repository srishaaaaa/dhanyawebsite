"use client";
import { useState, useTransition } from "react";
import { changeStaffPassword, startMfa, confirmMfa, disableMfa } from "@/app/admin/(panel)/account/actions";
import { Card, Field, inputCls, btn, Badge } from "./ui";

export default function StaffAccount({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [pending, start] = useTransition();
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [mfaMsg, setMfaMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [on, setOn] = useState(mfaEnabled);

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <Card title="Password">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await changeStaffPassword(pw.current, pw.next); setPwMsg(r); if (r.ok) setPw({ current: "", next: "" }); }); }}>
          <Field label="Current password"><input type="password" autoComplete="current-password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="New password (12+ characters)"><input type="password" autoComplete="new-password" minLength={12} className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          {pwMsg && <p role="status" className={`text-sm ${pwMsg.ok ? "text-emerald-800" : "text-burgundy"}`}>{pwMsg.message}</p>}
          <button disabled={pending} className={btn.primary}>Change password</button>
        </form>
      </Card>
      <Card title="Two-step sign-in">
        <p className="mb-3 text-sm">{on ? <Badge tone="ok">On</Badge> : <Badge tone="draft">Off</Badge>} <span className="ml-2 text-charcoal/70">A 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) is needed at sign-in.</span></p>
        {!on && !setup && <button disabled={pending} className={btn.primary} onClick={() => start(async () => { const r = await startMfa(); if (r.secret && r.uri) setSetup({ secret: r.secret, uri: r.uri }); setMfaMsg(r); })}>Set up two-step sign-in</button>}
        {!on && setup && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await confirmMfa(code); setMfaMsg(r); if (r.ok) { setOn(true); setSetup(null); setCode(""); } }); }}>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>In your authenticator app choose “Add account” → “Enter a setup key” (or open <a className="underline" href={setup.uri}>this link</a> on your phone).</li>
              <li>Account: your email · Key: <code className="select-all break-all bg-ivory px-1 font-mono">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code> · Type: time-based</li>
              <li>Enter the 6-digit code it shows:</li>
            </ol>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="6-digit code" className={`${inputCls} w-40 tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <button disabled={pending || code.length !== 6} className={btn.primary}>Turn on</button>
          </form>
        )}
        {on && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await disableMfa(code); setMfaMsg(r); if (r.ok) { setOn(false); setCode(""); } }); }}>
            <Field label="Current code to turn off"><input inputMode="numeric" maxLength={6} className={`${inputCls} w-40 tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></Field>
            <button disabled={pending || code.length !== 6} className={btn.danger}>Turn off</button>
          </form>
        )}
        {mfaMsg && <p role="status" className={`mt-3 text-sm ${mfaMsg.ok ? "text-emerald-800" : "text-burgundy"}`}>{mfaMsg.message}</p>}
      </Card>
    </div>
  );
}
