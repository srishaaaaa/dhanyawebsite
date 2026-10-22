/** DHANYA BOUTIQUE wordmark with a DB monogram variant. Pure SVG/text so it scales and inherits colour. */
export function Monogram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="currentColor" strokeWidth="0.4" opacity=".6" />
      <text x="32" y="40.5" textAnchor="middle" fontFamily="var(--font-serif), Georgia, serif" fontSize="23" fontWeight="400" letterSpacing="-1" fill="currentColor">DB</text>
      <path d="M32 4.5 l1.6 2.2 -1.6 2.2 -1.6 -2.2z M32 55 l1.6 2.2 -1.6 2.2 -1.6 -2.2z" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className = "", sub = true }: { className?: string; sub?: boolean }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span className="font-serif font-light tracking-wordmark text-[1.6em] pl-[0.35em]">DHANYA</span>
      {sub && <span className="mt-1 flex items-center gap-2 text-[0.5em] tracking-[0.5em] pl-[0.5em]">
        <span className="h-px w-5 bg-current opacity-50" aria-hidden />BOUTIQUE<span className="h-px w-5 bg-current opacity-50" aria-hidden />
      </span>}
    </span>
  );
}
