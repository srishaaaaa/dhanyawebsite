import { headers } from "next/headers";
import { db } from "@/db";
import { adminAuditLogs } from "@/db/schema";

export async function audit(
  actorId: string | null, action: string, entity: string,
  entityId?: string | null, meta?: Record<string, unknown>
) {
  let ip: string | null = null;
  try { ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null; } catch {}
  try {
    await db.insert(adminAuditLogs).values({ actorId, action, entity, entityId: entityId ?? null, meta: meta ?? null, ip });
  } catch (e) { console.error("audit log failed", e); }
}
