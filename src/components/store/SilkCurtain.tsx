/** Silk curtain divider: an ivory fabric edge that rises over the hero as the visitor scrolls (scrubbed by HomeMotion). */
export default function SilkCurtain() {
  return (
    <svg aria-hidden viewBox="0 0 1440 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-[10vw] min-h-[56px] w-full text-ivory">
      <path data-curtain d="M0,200 L0,176 C240,150 480,200 720,172 S1200,150 1440,176 L1440,200 Z" fill="currentColor" />
    </svg>
  );
}
