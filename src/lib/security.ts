import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";

export type Security = { requireStaffMfa: boolean };
export const getSecurity = cache(async (): Promise<Security> => {
  try {
    const [r] = await db.select().from(storeSettings).where(eq(storeSettings.key, "security")).limit(1);
    return { requireStaffMfa: false, ...(r?.value as object) };
  } catch { return { requireStaffMfa: false }; }
});
