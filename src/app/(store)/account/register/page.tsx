import type { Metadata } from "next";
import AuthShell from "@/components/store/AuthShell";
import { RegisterForm } from "@/components/store/AccountForms";
import { safeNext } from "@/lib/customer";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell title="Create an account">
        <p className="mt-3 mb-10 text-sm text-charcoal/65">Track orders, save addresses and keep your wishlist across devices.</p>
        <RegisterForm next={next} />
      </AuthShell>
  );
}
