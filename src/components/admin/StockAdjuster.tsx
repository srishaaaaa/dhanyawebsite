"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "@/app/admin/(panel)/inventory/actions";
import { STOCK_REASONS } from "@/lib/catalog/validation";

const LABEL: Record<string, string> = { restock: "Restock", correction: "Correction", damaged: "Damaged / lost", return: "Customer return", count: "Stock count" };

export default function StockAdjuster({ variantId, stock, reserved }: { variantId: string; stock: number; reserved: number }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"delta" | "set">("delta");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<(typeof STOCK_REASONS)[number]>("restock");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) return <button className="text-sm underline text-charcoal/70 hover:text-aubergine" onClick={() => setOpen(true)}>Adjust</button>;
  const n = Number(amount);
  const result = Number.isFinite(n) && amount !== "" ? (mode === "set" ? n : stock + n) : null;

  return (
    <form className="flex flex-wrap items-center gap-1.5 text-sm" onSubmit={(e) => {
      e.preventDefault(); setErr(null);
      start(async () => {
        const r = await adjustStock({ variantId, mode, amount, reason, note });
        if (r.ok) { setOpen(false); setAmount(""); setNote(""); router.refresh(); }
        else setErr(r.fields?.amount ?? r.error ?? "Couldn't update.");
      });
    }}>
      <select aria-label="Mode" value={mode} onChange={(e) => setMode(e.target.value as "delta" | "set")} className="border border-charcoal/20 px-1.5 py-1">
        <option value="delta">Add / remove</option><option value="set">Set to</option>
      </select>
      <input aria-label="Quantity" autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))}
        placeholder={mode === "delta" ? "+5 or -2" : String(stock)} className="w-20 border border-charcoal/20 px-2 py-1" />
      <select aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="border border-charcoal/20 px-1.5 py-1">
        {STOCK_REASONS.map((r) => <option key={r} value={r}>{LABEL[r]}</option>)}
      </select>
      <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="w-28 border border-charcoal/20 px-2 py-1" />
      <button disabled={pending || amount === ""} className="bg-aubergine px-2.5 py-1 text-ivory disabled:opacity-50">{pending ? "…" : "Save"}</button>
      <button type="button" onClick={() => { setOpen(false); setErr(null); }} className="px-1 text-charcoal/60">Cancel</button>
      {result !== null && <span className={`w-full text-xs ${result < reserved ? "text-burgundy" : "text-charcoal/60"}`}>New stock: {result}{result < reserved ? ` — below ${reserved} reserved` : ""}</span>}
      {err && <span role="alert" className="w-full text-xs text-burgundy">{err}</span>}
    </form>
  );
}
