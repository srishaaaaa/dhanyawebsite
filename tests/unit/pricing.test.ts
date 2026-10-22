import { describe, it, expect } from "vitest";
import { quote, allocate, type CouponRule } from "@/lib/pricing";

const ship = { flatFee: 99, freeShippingThreshold: 2999, taxOnDelivery: false };
const L = (key: string, unitExcl: number, gstRate: number, quantity: number, extra: Partial<{ productId: string; collectionIds: string[] }> = {}) =>
  ({ key, productId: key, collectionIds: [], unitExcl, gstRate, quantity, ...extra });
const kerala = { storeState: "Kerala", destinationState: "Kerala" };
const paise = (n: number) => Math.round(n * 100);

describe("pricing.quote", () => {
  it("charges CGST + SGST within the store's state and adds flat shipping below the threshold", () => {
    const q = quote([L("a", 1000, 5, 2)], { shipping: ship, tax: kerala });
    expect(q.subtotal).toBe(2100);
    expect(q.shipping).toBe(99);
    expect(q.grandTotal).toBe(2199);
    expect(q.cgst + q.sgst).toBe(100);
    expect(q.igst).toBe(0);
    expect(q.lines[0].taxable).toBe(2000);
  });

  it("charges IGST across states and ships free over the threshold", () => {
    const q = quote([L("a", 2000, 12, 2)], { shipping: ship, tax: { storeState: "Kerala", destinationState: "Maharashtra" } });
    expect(q.interState).toBe(true);
    expect(q.igst).toBe(480);
    expect(q.cgst).toBe(0);
    expect(q.shipping).toBe(0);
    expect(q.grandTotal).toBe(4480);
  });

  it("splits a fixed coupon across mixed-GST lines and reconciles to the paisa", () => {
    const c: CouponRule = { code: "FEST500", type: "fixed", value: 500, minOrderValue: 1000, maxDiscount: null, productIds: null, collectionIds: null };
    const q = quote([L("a", 999.99, 5, 1), L("b", 1499, 12, 3)], { coupon: c, shipping: ship, tax: kerala });
    expect(q.discount).toBe(500);
    const net = q.lines.reduce((s, l) => s + paise(l.netIncl), 0);
    expect(net).toBe(paise(q.subtotal) - paise(q.discount));
    const parts = q.lines.reduce((s, l) => s + paise(l.taxable) + paise(l.cgst) + paise(l.sgst) + paise(l.igst), 0);
    expect(parts).toBe(net);
  });

  it("applies product-restricted coupons only to eligible lines and enforces minimum order", () => {
    const c: CouponRule = { code: "X", type: "percentage", value: 10, minOrderValue: 99999, maxDiscount: null, productIds: ["b"], collectionIds: null };
    const none = { storeState: null, destinationState: null };
    expect(quote([L("a", 1000, 5, 1), L("b", 1000, 5, 1)], { coupon: c, shipping: ship, tax: none }).coupon?.applied).toBe(false);
    const q = quote([L("a", 1000, 5, 1), L("b", 1000, 5, 1)], { coupon: { ...c, minOrderValue: null }, shipping: ship, tax: none });
    expect(q.discount).toBe(105);
    expect(q.lines[0].discount).toBe(0);
  });

  it("caps percentage discounts and adds GST on shipping when configured", () => {
    const c: CouponRule = { code: "HALF", type: "percentage", value: 50, minOrderValue: null, maxDiscount: 750, productIds: null, collectionIds: null };
    const q = quote([L("a", 10000, 5, 1)], { coupon: c, shipping: { ...ship, freeShippingThreshold: null, taxOnDelivery: true }, tax: kerala });
    expect(q.discount).toBe(750);
    expect(q.shippingTax).toBe(17.82);
    expect(q.grandTotal).toBe(10500 - 750 + 99 + 17.82);
  });

  it("matches coupons by collection", () => {
    const c: CouponRule = { code: "EDIT", type: "fixed", value: 100, minOrderValue: null, maxDiscount: null, productIds: null, collectionIds: ["col"] };
    const q = quote([L("a", 1000, 0, 1, { collectionIds: ["col"] }), L("b", 1000, 0, 1)], { coupon: c, shipping: ship, tax: kerala });
    expect(q.lines[0].discount).toBe(100);
    expect(q.lines[1].discount).toBe(0);
  });

  it("charges nothing for an empty bag", () => {
    expect(quote([], { shipping: ship, tax: kerala }).grandTotal).toBe(0);
  });
});

describe("pricing.allocate", () => {
  it("allocates exactly", () => {
    expect(allocate(100, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
    expect(allocate(7, [0, 0])).toEqual([0, 0]);
  });
});
