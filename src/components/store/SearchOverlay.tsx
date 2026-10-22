"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import Img from "./Img";
import { formatINR } from "@/lib/money";

type R = { slug: string; name: string; image: string | null; price: number };
const KEY = "db_recent_searches";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]").slice(0, 6); } catch { return []; } };
export function rememberSearch(q: string) {
  try { const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6); localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
}

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<R[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => { ref.current?.showModal(); setRecent(readRecent()); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try { const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal }); setResults((await r.json()).results ?? []); }
      catch {} finally { setLoading(false); }
    }, 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  function submit(term: string) {
    const t = term.trim(); if (!t) return;
    rememberSearch(t); ref.current?.close(); router.push(`/search?q=${encodeURIComponent(t)}`);
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-label="Search the boutique"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-ivory/98 p-0 text-charcoal backdrop:bg-transparent">
      <div className="mx-auto max-w-3xl px-6 pt-8">
        <div className="flex justify-end"><button onClick={() => ref.current?.close()} aria-label="Close search" className="p-2"><X size={22} strokeWidth={1.4} /></button></div>
        <form onSubmit={(e) => { e.preventDefault(); submit(q); }} role="search" className="mt-6 flex items-center gap-4 border-b border-charcoal/40 pb-3">
          <Search size={22} strokeWidth={1.2} aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sarees, kurta sets, colours…" aria-label="Search"
            className="w-full bg-transparent font-serif text-3xl sm:text-4xl outline-none placeholder:text-charcoal/30" />
        </form>
        <div className="mt-8" aria-live="polite">
          {q.trim().length < 2 ? (
            recent.length > 0 && (
              <div>
                <p className="text-sm text-charcoal/60 mb-3">Recent searches</p>
                <ul className="flex flex-wrap gap-2">{recent.map((r) => <li key={r}><button onClick={() => submit(r)} className="border border-charcoal/20 px-3 py-1.5 text-sm hover:border-aubergine">{r}</button></li>)}</ul>
              </div>
            )
          ) : loading && results.length === 0 ? <p className="text-sm text-charcoal/60">Searching…</p>
            : results.length === 0 ? <p className="text-sm text-charcoal/70">Nothing matches “{q}”. Try a fabric, colour or occasion — or <Link href="/shop" className="underline" onClick={() => ref.current?.close()}>browse the full collection</Link>.</p>
            : (
              <>
                <ul className="divide-y divide-charcoal/10">
                  {results.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/products/${r.slug}`} onClick={() => { rememberSearch(q); ref.current?.close(); }} className="flex items-center gap-4 py-3 hover:text-burgundy">
                        <Img src={r.image} alt="" width={160} sizes="56px" className="h-[72px] w-14 object-cover" />
                        <span className="flex-1 font-serif text-xl">{r.name}</span>
                        <span className="text-sm tabular-nums">{formatINR(r.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <button onClick={() => submit(q)} className="mt-5 text-sm underline underline-offset-4">See all results for “{q}”</button>
              </>
            )}
        </div>
      </div>
    </dialog>
  );
}
