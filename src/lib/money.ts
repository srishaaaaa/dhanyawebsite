// Prices are stored GST-exclusive (numeric 12,2). Customers see GST-inclusive prices.
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function formatINR(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "";
  return fmt.format(Number(v));
}

/** Round to 2dp without float drift (works on paise integers). */
export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function withGst(price: string | number, gstRate: string | number) {
  return round2(Number(price) * (1 + Number(gstRate) / 100));
}

export function discountPercent(price: number, compareAt: number | null | undefined) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
