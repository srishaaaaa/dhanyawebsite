// Date ranges in India time for dashboards and reports.
export const RANGES = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", month: "This month", "90d": "Last 90 days" } as const;
export type RangeKey = keyof typeof RANGES | "custom";
const DAY = 86400_000;
const istDate = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);

export function resolveRange(sp: { r?: string; from?: string; to?: string }, now = new Date(), fallback: keyof typeof RANGES = "30d"): { from: Date; to: Date; key: RangeKey } {
  const ok = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
  if (sp.r === "custom" && ok(sp.from) && ok(sp.to)) {
    const from = new Date(`${sp.from}T00:00:00+05:30`), to = new Date(`${sp.to}T23:59:59.999+05:30`);
    if (from <= to) return { from, to, key: "custom" };
  }
  const key = (sp.r && sp.r in RANGES ? sp.r : fallback) as keyof typeof RANGES;
  const today = new Date(`${istDate(now)}T00:00:00+05:30`);
  const from =
    key === "today" ? today
    : key === "7d" ? new Date(today.getTime() - 6 * DAY)
    : key === "90d" ? new Date(today.getTime() - 89 * DAY)
    : key === "month" ? new Date(`${istDate(now).slice(0, 7)}-01T00:00:00+05:30`)
    : new Date(today.getTime() - 29 * DAY);
  return { from, to: now, key };
}
export { istDate };
