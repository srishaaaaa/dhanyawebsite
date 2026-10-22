"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";

export default function AdminLogin() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <main className="min-h-screen bg-aubergine flex items-center justify-center px-6">
      <form action={action} className="w-full max-w-sm bg-ivory p-8 space-y-5 border border-gold/40">
        <div className="text-center">
          <h1 className="font-serif text-3xl tracking-wordmark text-aubergine">DHANYA</h1>
          <p className="text-xs uppercase tracking-widest text-charcoal/60 mt-1">Admin sign in</p>
        </div>
        <label className="block text-sm">Email
          <input name="email" type="email" required autoComplete="username"
            className="mt-1 w-full border border-charcoal/20 bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">Password
          <input name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full border border-charcoal/20 bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">Authentication code <span className="text-charcoal/50">(if two-step sign-in is on)</span>
          <input name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]*"
            className="mt-1 w-full border border-charcoal/20 bg-white px-3 py-2 tracking-[0.3em]" />
        </label>
        {error && <p role="alert" className="text-sm text-burgundy">{error}</p>}
        <button disabled={pending}
          className="w-full bg-aubergine text-ivory py-2.5 text-sm uppercase tracking-widest hover:bg-burgundy disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
