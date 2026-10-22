import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set — database calls will fail.");
}
export const db = drizzle(neon(process.env.DATABASE_URL ?? "postgresql://x:x@localhost/x"), { schema });
