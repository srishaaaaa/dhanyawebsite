import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";

export type StoreInfo = {
  name: string; currency: string; timezone: string;
  email?: string; phone?: string; address?: string; whatsapp?: string;
  announcement?: string; social?: { instagram?: string; facebook?: string; pinterest?: string; youtube?: string };
};
export type ShippingSettings = {
  flatFee: number; freeShippingThreshold: number | null; taxOnDelivery: boolean; deliveryGstRate?: number;
  deliveryDays?: string; expressFee?: number | null; expressDays?: string; returnWindowDays?: number;
};
export type TaxSettings = { legalName?: string; gstin?: string; state?: string; address?: string; invoicePrefix?: string };
export type PaymentSettings = { codEnabled: boolean; codMaxOrder?: number | null; onlineEnabled: boolean };

export const SETTING_DEFAULTS = {
  store: { name: "DHANYA BOUTIQUE", currency: "INR", timezone: "Asia/Kolkata" } as StoreInfo,
  shipping: { flatFee: 0, freeShippingThreshold: null, taxOnDelivery: false, deliveryGstRate: 18, deliveryDays: "4–7", expressFee: null, expressDays: "1–3", returnWindowDays: 7 } as ShippingSettings,
  tax: { invoicePrefix: "DB" } as TaxSettings,
  payments: { codEnabled: false, codMaxOrder: null, onlineEnabled: true } as PaymentSettings,
};
export type SettingKey = keyof typeof SETTING_DEFAULTS;

/** Reads public, non-secret settings. Never throws — falls back to defaults if the DB is unreachable. */
export async function getSettings() {
  try {
    const rows = await db.select().from(storeSettings).where(inArray(storeSettings.key, Object.keys(SETTING_DEFAULTS)));
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, object>;
    return {
      store: { ...SETTING_DEFAULTS.store, ...map.store } as StoreInfo,
      shipping: { ...SETTING_DEFAULTS.shipping, ...map.shipping } as ShippingSettings,
      tax: { ...SETTING_DEFAULTS.tax, ...map.tax } as TaxSettings,
      payments: { ...SETTING_DEFAULTS.payments, ...map.payments } as PaymentSettings,
    };
  } catch (e) {
    console.error("settings unavailable", e);
    return SETTING_DEFAULTS;
  }
}
