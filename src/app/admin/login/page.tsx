"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";
import SilkField from "@/components/store/silk/SilkField";

export default function AdminLogin() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <main className="stage grain relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6">
      <SilkField tone="plum" className="-z-10" />
      <form action={action} className="frame w-full max-w-sm space-y-5 border border-gold/40 bg-ivory p-10 text-charcoal shadow-[0_60px_100px_-40px_rgba(0,0,0,.8)]">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-light tracking-wordmark text-aubergine">DHANYA</h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-burgundy">Atelier console</p>
        </div>
        <label className="block text-sm">Email
          <input name="email" type="email" required autoComplete="username"
            className="mt-1 w-full border border-charcoal/20 bg-white px-3 py-2.5 transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold" />
        </label>
        <label className="block text-sm">Password
          <input name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full border border-charcoal/20 bg-white px-3 py-2.5 transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold" />
        </label>
        <label className="block text-sm">Authentication code <span className="text-charcoal/50">(if two-step sign-in is on)</span>
          <input name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]*"
            className="mt-1 w-full border border-charcoal/20 bg-white px-3 py-2 tracking-[0.3em]" />
        </label>
        {error && <p role="alert" className="text-sm text-burgundy">{error}</p>}
        <button disabled={pending}
          className="btn-primary w-full">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
