import SilkField from "./SilkField";
import type { SilkTone } from "./SilkShader";

/**
 * A ribbon of living silk used as a visual thread between homepage sections. An optional line of words drifts across it
 * (CSS marquee, paused for reduced motion). Purely decorative; the words are repeated for aesthetics, so it is aria-hidden.
 */
export default function SilkBand({ words = [], tone = "plum", className = "h-[34vh] min-h-[220px]" }: { words?: string[]; tone?: SilkTone; className?: string }) {
  const line = words.length ? words.join("   ✦   ") + "   ✦   " : "";
  return (
    <div aria-hidden className={`relative isolate overflow-hidden ${className}`}>
      <SilkField tone={tone} />
      <div className="grain absolute inset-0" />
      {line && (
        <div className="absolute inset-0 flex items-center overflow-hidden">
          <div className="marquee flex shrink-0 whitespace-nowrap font-serif text-[clamp(3rem,9vw,8rem)] font-light italic leading-none text-ivory/90 mix-blend-overlay">
            <span>{line}</span><span>{line}</span><span>{line}</span>
          </div>
        </div>
      )}
    </div>
  );
}
