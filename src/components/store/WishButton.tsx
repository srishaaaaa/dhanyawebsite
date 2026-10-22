"use client";
import { Heart } from "lucide-react";
import { useStore } from "./StoreProviders";

export default function WishButton({ productId, name, className = "", label = false }: { productId: string; name: string; className?: string; label?: boolean }) {
  const { wishlist, toggleWish } = useStore();
  const on = wishlist.has(productId);
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(productId, name); }}
      aria-pressed={on} aria-label={on ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={`group/wish inline-flex items-center gap-2 ${className}`}>
      <Heart size={18} strokeWidth={1.4} className={`transition-transform duration-300 ${on ? "fill-burgundy text-burgundy scale-110" : "group-hover/wish:scale-110"}`} />
      {label && <span className="text-sm">{on ? "Saved" : "Save to wishlist"}</span>}
    </button>
  );
}
