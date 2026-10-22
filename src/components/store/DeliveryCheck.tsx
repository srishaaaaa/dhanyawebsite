"use client";
import { useState } from "react";

export default function DeliveryCheck({ days }: { days: string }) {
  const [pin, setPin] = useState("");
  const [res, setRes] = useState<string | null>(null);
  return (
    <form className="text-sm" onSubmit={(e) => {
      e.preventDefault();
      setRes(/^[1-9]\d{5}$/.test(pin) ? `Estimated delivery to ${pin}: ${days} working days after dispatch. Exact timing is confirmed at checkout.` : "Enter a valid 6-digit PIN code.");
    }}>
      <label htmlFor="pin" className="block mb-2">Check delivery</label>
      <div className="flex max-w-xs border-b border-charcoal/40">
        <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="PIN code" className="flex-1 bg-transparent py-2 outline-none" />
        <button className="px-2 text-xs tracking-[0.15em]">CHECK</button>
      </div>
      {res && <p aria-live="polite" className="mt-2 text-charcoal/70">{res}</p>}
    </form>
  );
}
