import { formatINR, discountPercent } from "@/lib/money";

export default function Price({ price, compareAt, className = "", size = "md" }: { price: number; compareAt?: number | null; className?: string; size?: "md" | "lg" }) {
  const off = discountPercent(price, compareAt ?? null);
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 tabular-nums ${size === "lg" ? "text-xl" : "text-sm"} ${className}`}>
      <span className="text-charcoal">{formatINR(price)}</span>
      {off > 0 && <>
        <s className="text-charcoal/45 text-[0.9em]"><span className="sr-only">Was </span>{formatINR(compareAt!)}</s>
        <span className="text-burgundy text-[0.85em]">{off}% off</span>
      </>}
    </p>
  );
}
