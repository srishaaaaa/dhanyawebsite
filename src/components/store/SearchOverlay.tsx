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
      className="stage grain modal-in m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-plum p-0 text-ivory backdrop:bg-transparent">
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <div className="flex items-center justify-between">
          <p className="kicker">Search the boutique</p>
          <button onClick={() => ref.current?.close()} aria-label="Close search" className="flex items-center gap-2 p-2 text-[11px] uppercase tracking-[0.3em]">Esc <X size={20} strokeWidth={1.3} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit(q); }} role="search" className="mt-10 flex items-center gap-5 border-b border-gold/50 pb-4">
          <Search size={26} strokeWidth={1.1} aria-hidden className="text-gold" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="A fabric, a colour, an occasion…" aria-label="Search"
            className="w-full bg-transparent font-serif text-4xl font-light outline-none placeholder:text-ivory/25 sm:text-6xl" />
        </form>
        <div className="mt-10" aria-live="polite">
          {q.trim().length < 2 ? (
            recent.length > 0 && (
              <div>
                <p className="kicker mb-4">Recent</p>
                <ul className="flex flex-wrap gap-2">{recent.map((r) => <li key={r}><button onClick={() => submit(r)} className="border border-ivory/25 px-4 py-2 text-sm transition-colors hover:border-gold hover:text-gold">{r}</button></li>)}</ul>
              </div>
            )
          ) : loading && results.length === 0 ? <p className="text-sm text-ivory/60">Searching…</p>
            : results.length === 0 ? <p className="text-ivory/75">Nothing matches “{q}”. Try a fabric, colour or occasion — or <Link href="/shop" className="text-gold underline underline-offset-4" onClick={() => ref.current?.close()}>browse the full collection</Link>.</p>
            : (
              <>
                <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {results.slice(0, 8).map((r) => (
                    <li key={r.slug} className="toast-in">
                      <Link href={`/products/${r.slug}`} onClick={() => { rememberSearch(q); ref.current?.close(); }} className="group block">
                        <div className="relative aspect-[3/4] overflow-hidden bg-burgundy/40">
                          <Img src={r.image} alt="" width={480} sizes="(min-width:1024px) 20vw, 45vw" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]" />
                        </div>
                        <span className="mt-3 block font-serif text-xl font-light leading-tight group-hover:text-gold">{r.name}</span>
                        <span className="mt-1 block text-sm tabular-nums text-ivory/65">{formatINR(r.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <button onClick={() => submit(q)} className="btn-ghost-light mt-10">See all results for “{q}”</button>
              </>
            )}
        </div>
      </div>
    </dialog>
  );
}
