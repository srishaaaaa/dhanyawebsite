import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { scryptSync, randomBytes } from "node:crypto";
import * as s from "./schema";

// Dev-only seed. Creates the FIRST admin from env vars and default settings/pages.
async function main() {
  const db = drizzle(neon(process.env.DATABASE_URL!));
  const email = process.env.ADMIN_EMAIL, pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw || pw.length < 12) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars) in .env");

  const salt = randomBytes(16).toString("hex");
  const passwordHash = `scrypt$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;

  const [user] = await db.insert(s.users).values({ email: email.toLowerCase(), name: "Owner", passwordHash })
    .onConflictDoUpdate({ target: s.users.email, set: { passwordHash } }).returning();
  await db.insert(s.userRoles).values({ userId: user.id, role: "owner" })
    .onConflictDoUpdate({ target: s.userRoles.userId, set: { role: "owner" } });

  await db.insert(s.storeSettings).values([
    { key: "store", value: { name: "DHANYA BOUTIQUE", currency: "INR", timezone: "Asia/Kolkata" } },
    { key: "shipping", value: { flatFee: 0, freeShippingThreshold: null, taxOnDelivery: false } },
  ]).onConflictDoNothing();

  await db.insert(s.pages).values(
    ["about","contact","faq","shipping-policy","returns","privacy","terms","size-guide"].map((slug) => ({
      slug, title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), status: "draft" as const,
    }))
  ).onConflictDoNothing();
  console.log("Seed complete. Admin:", email);
}
main().catch((e) => { console.error(e); process.exit(1); });
