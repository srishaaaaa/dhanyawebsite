"use client";
import { useActionState } from "react";
import { subscribe, sendContact } from "@/app/(store)/actions";

const Honeypot = () => (
  <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
    <label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
  </div>
);

export function NewsletterForm({ dark = true }: { dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribe, null);
  if (state?.ok) return <p role="status" className="font-serif text-2xl">{state.message}</p>;
  return (
    <form action={action} className="relative max-w-md">
      <Honeypot />
      <div className={`flex border-b ${dark ? "border-ivory/50" : "border-charcoal/40"}`}>
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="Your email address"
          className={`flex-1 bg-transparent py-3 text-sm outline-none ${dark ? "placeholder:text-ivory/50" : "placeholder:text-charcoal/40"}`} />
        <button disabled={pending} className="px-2 text-[11px] font-medium uppercase tracking-[0.26em] text-gold transition-opacity hover:opacity-70">{pending ? "…" : "Subscribe →"}</button>
      </div>
      <label className={`mt-3 flex items-start gap-2 text-xs ${dark ? "text-ivory/70" : "text-charcoal/60"}`}>
        <input type="checkbox" name="consent" required className="mt-0.5 accent-gold" />
        I agree to receive emails from DHANYA BOUTIQUE. Unsubscribe any time. See our <a href="/privacy" className="underline">privacy policy</a>.
      </label>
      {state && !state.ok && <p role="alert" className="mt-2 text-xs text-rose">{state.message}</p>}
    </form>
  );
}

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, null);
  if (state?.ok) return <p role="status" className="font-serif text-2xl text-aubergine">{state.message}</p>;
  const field = "field mt-1";
  return (
    <form action={action} className="relative space-y-6">
      <Honeypot />
      <label className="block text-[11px] font-medium uppercase tracking-[0.22em] text-charcoal/70">Your name<input name="name" required autoComplete="name" className={field} /></label>
      <label className="block text-[11px] font-medium uppercase tracking-[0.22em] text-charcoal/70">Email<input name="email" type="email" required autoComplete="email" className={field} /></label>
      <label className="block text-[11px] font-medium uppercase tracking-[0.22em] text-charcoal/70">How can we help?<textarea name="message" rows={5} required minLength={10} className={field} /></label>
      {state && !state.ok && <p role="alert" className="text-sm text-burgundy">{state.message}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
