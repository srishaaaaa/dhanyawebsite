import type { Metadata } from "next";
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
    <div className="container-x grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="display text-5xl mb-10">Sign in</h1>
        <LoginForm next={next} reset={sp.reset === "1"} />
      </div>
    </div>
  );
}
