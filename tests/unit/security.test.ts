import { describe, it, expect } from "vitest";
import { hotp, base32Encode, base32Decode, verifyTotp } from "@/lib/totp";
import { hashPassword, verifyPassword } from "@/lib/password";
import { financialYear } from "@/lib/orders-sql";
import { resolveRange } from "@/lib/date-range";
import { validateSection, DEFAULTS, SECTION_SCHEMAS, type SectionType } from "@/lib/homepage-schema";

describe("totp (RFC 4226 / 6238 vectors)", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  it("encodes base32", () => {
    expect(secret).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
  });
  it("produces the RFC HOTP values", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => hotp(secret, i))).toEqual(["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"]);
  });
  it("verifies within ±1 step and rejects others", () => {
    expect(verifyTotp(secret, "287082", 59_000)).toBe(1);
    expect(verifyTotp(secret, "287082", 59_000 + 60_000)).toBe(null);
    expect(verifyTotp(secret, "abc", 59_000)).toBe(null);
  });
});

describe("password hashing", () => {
  it("verifies the right password only", () => {
    const h = hashPassword("correct horse battery");
    expect(verifyPassword("correct horse battery", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(verifyPassword("anything", null)).toBe(false);
  });
});

describe("financial year", () => {
  it("rolls over on 1 April IST", () => {
    expect(financialYear(new Date("2026-03-31T18:00:00Z"))).toBe("2025-26"); // 31 Mar 23:30 IST
    expect(financialYear(new Date("2026-03-31T18:31:00Z"))).toBe("2026-27"); // 1 Apr 00:01 IST
  });
});

describe("date ranges", () => {
  it("resolves presets in India time", () => {
    const now = new Date("2026-10-21T20:00:00Z"); // 22 Oct 01:30 IST
    expect(resolveRange({ r: "today" }, now).from.toISOString()).toBe("2026-10-21T18:30:00.000Z");
    expect(resolveRange({ r: "month" }, now).from.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(resolveRange({ r: "custom", from: "2026-10-05", to: "2026-10-01" }, now).key).toBe("30d"); // inverted range ignored
  });
});

describe("homepage schema", () => {
  it("accepts every default section", () => {
    for (const t of Object.keys(SECTION_SCHEMAS) as SectionType[]) expect(validateSection(t, DEFAULTS[t]).ok).toBe(true);
  });
  it("rejects unsafe links and empty headlines", () => {
    const bad = validateSection("hero", { ...DEFAULTS.hero, heading: "", primaryCta: { label: "Go", href: "javascript:alert(1)" } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) { expect(Object.keys(bad.errors)).toContain("heading"); expect(Object.keys(bad.errors)).toContain("primaryCta.href"); }
  });
});
