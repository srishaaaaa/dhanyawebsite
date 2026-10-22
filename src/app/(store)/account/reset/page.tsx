import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/store/AccountForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Reset({ searchParams }: { searchParams: Promise<{ email?: string; token?: string }> }) {
  const { email, token } = await searchParams;
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="display text-5xl mb-10">Choose a new password</h1>
        {email && token ? <ResetForm email={email} token={token} /> : <p>This link is incomplete. <Link href="/account/forgot" className="underline">Request a new one</Link>.</p>}
      </div>
    </div>
  );
}
