"use client";
import { Share2 } from "lucide-react";
import { useStore } from "./StoreProviders";

export default function ShareButton({ title }: { title: string }) {
  const { toast } = useStore();
  return (
    <button type="button" className="flex items-center gap-2 text-sm text-charcoal/70 hover:text-aubergine" onClick={async () => {
      const url = window.location.href.split("?")[0];
      try {
        if (navigator.share) await navigator.share({ title, url });
        else { await navigator.clipboard.writeText(url); toast("Link copied."); }
      } catch { /* user cancelled */ }
    }}><Share2 size={15} strokeWidth={1.4} />Share</button>
  );
}
