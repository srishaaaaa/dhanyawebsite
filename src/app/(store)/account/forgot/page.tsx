import type { Metadata } from "next";
import AuthShell from "@/components/store/AuthShell";
import { ForgotForm } from "@/components/store/AccountForms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Forgot() {
  return (
    <AuthShell title="Reset password">
        <p className="mt-3 mb-10 text-sm text-charcoal/65">Enter your account email and we&apos;ll send you a link.</p>
        <ForgotForm />
      </AuthShell>
  );
}
