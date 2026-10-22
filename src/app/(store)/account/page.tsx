import type { Metadata } from "next";
import { requireCustomer } from "@/lib/customer";
import AccountLayout from "@/components/store/AccountNav";
import { ProfileForm, PasswordForm } from "@/components/store/AccountForms";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Account() {
  const me = await requireCustomer("/account");
  return (
    <AccountLayout active="/account" name={me.name}>
      <div className="grid gap-14 md:grid-cols-2">
        <section><h2 className="font-serif text-3xl mb-6">Profile</h2><ProfileForm name={me.name ?? ""} phone={me.phone ?? ""} email={me.email} /></section>
        <section><h2 className="font-serif text-3xl mb-6">Password</h2><PasswordForm /></section>
      </div>
    </AccountLayout>
  );
}
