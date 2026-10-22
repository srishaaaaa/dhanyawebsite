"use client";
import { useState } from "react";

export default function NotifyMe({ variantId, label }: { variantId: string; label: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  if (state === "done") return <p role="status" className="text-sm text-emerald-800">We&apos;ll email you once when {label} is back.</p>;
  return (
    <form className="space-y-2" onSubmit={async (e) => {
      e.preventDefault(); setState("busy");
      const r = await fetch("/api/stock-alert", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ variantId, email }) }).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      if (r?.ok) setState("done"); else { setErr(d?.error ?? "Couldn't save your request."); setState("error"); }
    }}>
      <p className="text-sm">{label} is sold out. Get an email when it&apos;s back:</p>
      <div className="flex max-w-sm border-b border-charcoal/40">
        <label htmlFor={`nm-${variantId}`} className="sr-only">Email</label>
        <input id={`nm-${variantId}`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="flex-1 bg-transparent py-2 text-sm outline-none" />
        <button disabled={state === "busy"} className="px-2 text-xs tracking-[0.15em]">NOTIFY ME</button>
      </div>
      {state === "error" && <p role="alert" className="text-xs text-burgundy">{err}</p>}
    </form>
  );
}
