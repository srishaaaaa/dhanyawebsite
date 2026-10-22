import Link from "next/link";

export const inputCls = "mt-1 w-full border border-charcoal/20 bg-white px-3 py-2 text-sm rounded-sm focus:border-aubergine focus:outline-none";
export const btn = {
  primary: "inline-flex items-center justify-center gap-2 bg-aubergine px-4 py-2 text-sm text-ivory hover:bg-burgundy disabled:opacity-50 rounded-sm",
  secondary: "inline-flex items-center justify-center gap-2 border border-charcoal/20 bg-white px-4 py-2 text-sm hover:border-aubergine disabled:opacity-50 rounded-sm",
  danger: "inline-flex items-center justify-center gap-2 border border-burgundy/40 px-4 py-2 text-sm text-burgundy hover:bg-burgundy hover:text-ivory disabled:opacity-50 rounded-sm",
  ghost: "inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-aubergine",
};

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-serif text-4xl text-aubergine">{title}</h1>
        {description && <p className="text-sm text-charcoal/60 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white border border-charcoal/10 p-5 ${className}`}>
      {title && <h2 className="font-serif text-xl text-aubergine mb-4">{title}</h2>}
      {children}
    </section>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-charcoal/80">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-charcoal/50 mt-1">{hint}</span>}
      {error && <span role="alert" className="block text-xs text-burgundy mt-1">{error}</span>}
    </label>
  );
}

const TONES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-charcoal/5 text-charcoal/60 border-charcoal/15",
  scheduled: "bg-sky-50 text-sky-800 border-sky-200",
  low: "bg-amber-50 text-amber-800 border-amber-200",
  out: "bg-rose text-burgundy border-burgundy/20",
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
  muted: "bg-charcoal/5 text-charcoal/60 border-charcoal/15",
};
export function Badge({ tone, children }: { tone: keyof typeof TONES | string; children: React.ReactNode }) {
  return <span className={`inline-block border px-2 py-0.5 text-[11px] rounded-sm ${TONES[tone] ?? TONES.muted}`}>{children}</span>;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="bg-white border border-dashed border-charcoal/20 p-10 text-center">
      <p className="font-serif text-2xl text-aubergine">{title}</p>
      {body && <p className="text-sm text-charcoal/60 mt-2">{body}</p>}
      {action && <Link href={action.href} className={`${btn.primary} mt-5`}>{action.label}</Link>}
    </div>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm mt-4">
      <span className="text-charcoal/60">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className={btn.secondary} href={href(page - 1)}>Previous</Link> : <span className={`${btn.secondary} opacity-40`}>Previous</span>}
        {page < pages ? <Link className={btn.secondary} href={href(page + 1)}>Next</Link> : <span className={`${btn.secondary} opacity-40`}>Next</span>}
      </div>
    </nav>
  );
}

/** Builds a query string from current params with overrides; drops empty values. */
export function qs(base: Record<string, string | undefined>, over: Record<string, string | number | undefined> = {}) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v !== undefined && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
