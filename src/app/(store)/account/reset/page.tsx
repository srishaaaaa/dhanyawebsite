import type { Metadata } from "next";
import AuthShell from "@/components/store/AuthShell";
import Link from "next/link";
import { ResetForm } from "@/components/store/AccountForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Reset({ searchParams }: { searchParams: Promise<{ email?: string; token?: string }> }) {
  const { email, token } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
        {email && token ? <ResetForm email={email} token={token} /> : <p>This link is incomplete. <Link href="/account/forgot" className="underline">Request a new one</Link>.</p>}
      </AuthShell>
  );
}
