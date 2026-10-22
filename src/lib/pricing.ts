// Pure pricing / GST maths. No DB access, so it can be unit-tested and reused for quotes and orders.
// All arithmetic is done in integer paise to avoid floating-point drift.

export type PriceLine = {
  key: string;               // variant id
  productId: string;
  collectionIds: string[];
  unitExcl: number;          // GST-exclusive unit price (rupees)
  gstRate: number;           // percent
  quantity: number;
};

export type CouponRule = {
  code: string; type: "percentage" | "fixed"; value: number; minOrderValue: number | null; maxDiscount: number | null;
  productIds: string[] | null; collectionIds: string[] | null;
};

export type ShippingRules = {
  flatFee: number; freeShippingThreshold: number | null; taxOnDelivery: boolean; deliveryGstRate?: number;
  expressFee?: number | null;
};

export type TaxContext = { storeState: string | null; destinationState: string | null };

export type PricedLine = {
  key: string; quantity: number; gstRate: number;
  unitIncl: number; lineIncl: number; discount: number; netIncl: number; taxable: number;
  cgst: number; sgst: number; igst: number;
};

export type Quote = {
  lines: PricedLine[];
  subtotal: number;           // GST-inclusive, before discount
  discount: number;
  shipping: number;           // fee before shipping GST
  shippingTax: number;
  cgst: number; sgst: number; igst: number;
  taxTotal: number;           // goods GST (+ shipping GST)
  grandTotal: number;
  interState: boolean;
  coupon: { code: string; applied: boolean; message: string } | null;
};

const P = (r: number) => Math.round(r * 100);       // rupees → paise
const R = (p: number) => p / 100;                   // paise → rupees

export function couponEligible(line: PriceLine, c: CouponRule) {
  const byProduct = c.productIds?.length ? c.productIds.includes(line.productId) : null;
  const byCollection = c.collectionIds?.length ? line.collectionIds.some((x) => c.collectionIds!.includes(x)) : null;
  if (byProduct === null && byCollection === null) return true;
  return Boolean(byProduct) || Boolean(byCollection);
}

/** Splits `total` paise across weights proportionally; remainders go to the largest weights so the sum is exact. */
export function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) out[order[k][1]]++;
  return out;
}

export function quote(lines: PriceLine[], opts: { coupon?: CouponRule | null; shipping: ShippingRules; tax: TaxContext; method?: "standard" | "express" }): Quote {
  const interState = Boolean(opts.tax.storeState && opts.tax.destinationState && opts.tax.storeState.toLowerCase() !== opts.tax.destinationState.toLowerCase());

  const base = lines.map((l) => {
    const unitIncl = Math.round(P(l.unitExcl) * (1 + l.gstRate / 100));
    return { l, unitIncl, lineIncl: unitIncl * l.quantity };
  });
  const subtotal = base.reduce((a, b) => a + b.lineIncl, 0);

  // Coupon (applied to GST-inclusive amounts so the shopper saves exactly what was promised).
  let discount = 0;
  let discounts = base.map(() => 0);
  let couponState: Quote["coupon"] = null;
  const c = opts.coupon;
  if (c) {
    const eligible = base.map((b) => (couponEligible(b.l, c) ? b.lineIncl : 0));
    const eligibleTotal = eligible.reduce((a, b) => a + b, 0);
    if (eligibleTotal === 0) couponState = { code: c.code, applied: false, message: "This code doesn't apply to the items in your bag." };
    else if (c.minOrderValue && subtotal < P(c.minOrderValue)) couponState = { code: c.code, applied: false, message: `Add items worth ₹${(c.minOrderValue - R(subtotal)).toLocaleString("en-IN")} more to use this code.` };
    else {
      discount = c.type === "percentage" ? Math.round((eligibleTotal * Math.min(c.value, 100)) / 100) : Math.min(P(c.value), eligibleTotal);
      if (c.maxDiscount) discount = Math.min(discount, P(c.maxDiscount));
      couponState = { code: c.code, applied: true, message: c.type === "percentage" ? `${c.value}% off applied.` : `₹${c.value.toLocaleString("en-IN")} off applied.` };
    }
    discounts = allocate(discount, eligible);
  }

  const priced: PricedLine[] = base.map((b, i) => {
    const netIncl = b.lineIncl - discounts[i];
    const taxable = Math.round(netIncl / (1 + b.l.gstRate / 100));
    const tax = netIncl - taxable;
    const cg = interState ? 0 : Math.floor(tax / 2);
    return {
      key: b.l.key, quantity: b.l.quantity, gstRate: b.l.gstRate,
      unitIncl: R(b.unitIncl), lineIncl: R(b.lineIncl), discount: R(discounts[i]), netIncl: R(netIncl), taxable: R(taxable),
      cgst: R(cg), sgst: R(interState ? 0 : tax - cg), igst: R(interState ? tax : 0),
    };
  });

  const merchandise = subtotal - discount;
  const free = opts.shipping.freeShippingThreshold !== null && merchandise >= P(opts.shipping.freeShippingThreshold);
  const fee = lines.length === 0 ? 0
    : opts.method === "express" && opts.shipping.expressFee ? P(opts.shipping.expressFee)
    : free ? 0 : P(opts.shipping.flatFee || 0);
  const shippingTax = opts.shipping.taxOnDelivery ? Math.round((fee * (opts.shipping.deliveryGstRate ?? 18)) / 100) : 0;

  const sum = (k: "cgst" | "sgst" | "igst") => priced.reduce((a, l) => a + P(l[k]), 0);
  let cgst = sum("cgst"), sgst = sum("sgst"), igst = sum("igst");
  if (shippingTax) {
    if (interState) igst += shippingTax;
    else { const h = Math.floor(shippingTax / 2); cgst += h; sgst += shippingTax - h; }
  }
  return {
    lines: priced, subtotal: R(subtotal), discount: R(discount), shipping: R(fee), shippingTax: R(shippingTax),
    cgst: R(cgst), sgst: R(sgst), igst: R(igst), taxTotal: R(cgst + sgst + igst),
    grandTotal: R(merchandise + fee + shippingTax), interState, coupon: couponState,
  };
}
