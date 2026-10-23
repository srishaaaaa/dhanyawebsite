import type { Metadata } from "next";
import AuthShell from "@/components/store/AuthShell";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/store/AccountForms";
import { getCustomer, safeNext } from "@/lib/customer";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCustomer()) redirect(next);
  return (
    <AuthShell title="Sign in">
        <LoginForm next={next} reset={sp.reset === "1"} />
      </AuthShell>
  );
}
