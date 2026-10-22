import { describe, it, expect } from "vitest";
import { toCsv, parseCsv } from "@/lib/csv";
import { renderMarkdown } from "@/lib/markdown";
import { slugify, SLUG_RE } from "@/lib/slug";
import { MOBILE_RE, PINCODE_RE, normaliseMobile } from "@/lib/india";
import { formatINR, withGst, discountPercent } from "@/lib/money";

describe("csv", () => {
  it("round-trips quotes, commas and newlines", () => {
    const csv = toCsv(["a", "b"], [{ a: 'He said "hi", twice', b: "line1\nline2" }]);
    expect(parseCsv(csv)).toEqual([{ a: 'He said "hi", twice', b: "line1\nline2" }]);
  });
  it("neutralises spreadsheet formulas on export and restores them on import", () => {
    const csv = toCsv(["a"], [{ a: "=HYPERLINK(1)" }]);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(parseCsv(csv)[0].a).toBe("=HYPERLINK(1)");
  });
  it("joins arrays with pipes", () => {
    expect(toCsv(["t"], [{ t: ["silk", "festive"] }])).toContain("silk|festive");
  });
});

describe("markdown", () => {
  it("escapes HTML", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
  });
  it("drops javascript: links but keeps safe ones", () => {
    expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("href");
    expect(renderMarkdown("[shop](/shop)")).toContain('href="/shop"');
  });
  it("renders headings, lists and emphasis", () => {
    const h = renderMarkdown("## Title\n\n- one\n- **two**\n\n1. a\n2. b");
    expect(h).toContain("<h3>Title</h3>");
    expect(h).toContain("<ul>");
    expect(h).toContain("<strong>two</strong>");
    expect(h).toContain("<ol>");
  });
});

describe("slug", () => {
  it("makes clean slugs", () => {
    expect(slugify("Chanderi Kurta Set — Wine & Gold")).toBe("chanderi-kurta-set-wine-and-gold");
    expect(SLUG_RE.test("festive-edit-2026")).toBe(true);
    expect(SLUG_RE.test("Bad Slug")).toBe(false);
  });
});

describe("india", () => {
  it("validates mobiles and PIN codes", () => {
    for (const ok of ["9876543210", "+91 9876543210", "09876543210", "+91-9876543210"]) expect(MOBILE_RE.test(ok)).toBe(true);
    for (const bad of ["5876543210", "98765", "+44 7700900000"]) expect(MOBILE_RE.test(bad)).toBe(false);
    expect(normaliseMobile("+91 98765 43210")).toBe("9876543210");
    expect(PINCODE_RE.test("682001")).toBe(true);
    expect(PINCODE_RE.test("082001")).toBe(false);
  });
});

describe("money", () => {
  it("formats INR and computes GST-inclusive prices", () => {
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(withGst(1000, 12)).toBe(1120);
    expect(discountPercent(750, 1000)).toBe(25);
    expect(discountPercent(1000, 900)).toBe(0);
  });
});
