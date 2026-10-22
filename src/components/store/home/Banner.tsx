import Link from "next/link";
import type { BannerContent } from "@/lib/homepage-schema";

const TONES = { gold: "bg-gold text-aubergine", aubergine: "bg-aubergine text-ivory", rose: "bg-rose text-burgundy" } as const;

export default function Banner({ c }: { c: BannerContent }) {
  return (
    <aside aria-label="Promotion" className={`${TONES[c.tone ?? "gold"]} px-5 py-5`}>
      <div className="container-x flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center">
        <p className="font-serif text-xl sm:text-2xl">{c.text}</p>
        {c.cta?.label && c.cta.href && <Link href={c.cta.href} className="nav-link text-xs tracking-[0.2em]">{c.cta.label.toUpperCase()}</Link>}
      </div>
    </aside>
  );
}
