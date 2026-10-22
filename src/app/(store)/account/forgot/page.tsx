import type { Metadata } from "next";
import { ForgotForm } from "@/components/store/AccountForms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Forgot() {
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="display text-5xl">Reset password</h1>
        <p className="mt-3 mb-10 text-sm text-charcoal/65">Enter your account email and we&apos;ll send you a link.</p>
        <ForgotForm />
      </div>
    </div>
  );
}
