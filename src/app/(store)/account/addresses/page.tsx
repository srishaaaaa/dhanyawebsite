import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { requireCustomer } from "@/lib/customer";
import AccountLayout from "@/components/store/AccountNav";
import { AddressBook } from "@/components/store/AccountForms";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Addresses() {
  const me = await requireCustomer("/account/addresses");
  const list = await db.select().from(addresses).where(eq(addresses.userId, me.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return <AccountLayout active="/account/addresses" name={me.name}><AddressBook list={list} /></AccountLayout>;
}
