import Link from "next/link";
import type { BannerContent } from "@/lib/homepage-schema";

const TONES = { gold: "bg-gold text-plum", aubergine: "bg-plum text-ivory", rose: "bg-rose text-burgundy" } as const;

export default function Banner({ c }: { c: BannerContent }) {
  return (
    <aside aria-label="Promotion" className={`${TONES[c.tone ?? "gold"]} px-5 py-5`}>
      <div className="container-x flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center">
        <p className="font-serif text-xl font-light italic sm:text-2xl">{c.text}</p>
        {c.cta?.label && c.cta.href && <Link href={c.cta.href} className="nav-link text-[11px] uppercase tracking-[0.26em]">{c.cta.label} →</Link>}
      </div>
    </aside>
  );
}
