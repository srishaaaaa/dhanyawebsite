"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { rememberSearch } from "./SearchOverlay";

export default function SearchBox({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();
  return (
    <form role="search" className="flex max-w-xl items-center gap-3 border-b border-charcoal/40 pb-2"
      onSubmit={(e) => { e.preventDefault(); const t = q.trim(); if (t) { rememberSearch(t); router.push(`/search?q=${encodeURIComponent(t)}`); } }}>
      <Search size={18} strokeWidth={1.3} aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" placeholder="Search the boutique" className="flex-1 bg-transparent py-2 text-lg outline-none" />
      <button className="text-sm">Search</button>
    </form>
  );
}
