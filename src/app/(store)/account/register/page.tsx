import type { Metadata } from "next";
import { RegisterForm } from "@/components/store/AccountForms";
import { safeNext } from "@/lib/customer";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="display text-5xl">Create an account</h1>
        <p className="mt-3 mb-10 text-sm text-charcoal/65">Track orders, save addresses and keep your wishlist across devices.</p>
        <RegisterForm next={next} />
      </div>
    </div>
  );
}
