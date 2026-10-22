import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

/**
 * Integration tests run against a real, disposable Postgres (local Docker or a Neon branch):
 *   TEST_DATABASE_URL=postgres://… npm run test:db
 * Each run creates a fresh schema, applies every migration in /drizzle, and drops it afterwards.
 */
export const url = process.env.TEST_DATABASE_URL;
const dialect = new PgDialect();
export const schema = `t_${Date.now().toString(36)}`;

export async function connect() {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query(`SET search_path TO ${schema}, public`);
  return c;
}

export async function migrate(c: pg.Client) {
  await c.query(`CREATE SCHEMA ${schema}`);
  await c.query(`SET search_path TO ${schema}, public`);
  const dir = join(process.cwd(), "drizzle");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    const text = readFileSync(join(dir, f), "utf8").replace(/"public"\./g, "");
    for (const stmt of text.split("--> statement-breakpoint")) if (stmt.trim()) await c.query(stmt);
  }
}

export async function drop(c: pg.Client) {
  await c.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
}

/** Runs a drizzle `sql` template exactly as the app sends it (parameterised). */
export async function run<T = Record<string, unknown>>(c: pg.Client, q: SQL) {
  const { sql, params } = dialect.sqlToQuery(q);
  return (await c.query(sql, params as unknown[])).rows as T[];
}
