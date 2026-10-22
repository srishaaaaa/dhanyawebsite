import { requireSection } from "@/lib/authz";
import { getSettings } from "@/lib/settings";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import SettingsForm from "@/components/admin/SettingsForm";
import { razorpayConfigured, razorpayMode } from "@/lib/razorpay";
import { emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await requireSection("payments", "admin");
  const { payments } = await getSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://your-domain";
  const rows: [string, boolean, string][] = [
    ["Razorpay API keys", razorpayConfigured(), razorpayConfigured() ? `${razorpayMode()} mode` : "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"],
    ["Razorpay public key", Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID), "NEXT_PUBLIC_RAZORPAY_KEY_ID"],
    ["Razorpay webhook secret", Boolean(process.env.RAZORPAY_WEBHOOK_SECRET), "RAZORPAY_WEBHOOK_SECRET"],
    ["Order emails (Resend)", emailConfigured(), "RESEND_API_KEY and EMAIL_FROM"],
    ["Reservation cleanup cron", Boolean(process.env.CRON_SECRET), "CRON_SECRET (see vercel.json)"],
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Secret keys live only in server environment variables — this page shows whether they're set, never their values." />
      <Card title="Connections">
        <ul className="divide-y divide-charcoal/10 text-sm">{rows.map(([k, ok, hint]) => <li key={k} className="flex items-center justify-between gap-4 py-2.5"><span>{k}<span className="block text-xs text-charcoal/50">{hint}</span></span>{ok ? <Badge tone="ok">Connected</Badge> : <Badge tone="draft">Not set</Badge>}</li>)}</ul>
        <div className="mt-4 text-sm">
          <p>In the Razorpay Dashboard → Webhooks, add:</p>
          <p className="mt-1 select-all bg-ivory px-2 py-1 font-mono text-xs">{site}/api/webhooks/razorpay</p>
          <p className="mt-1 text-xs text-charcoal/60">Events: payment.captured, order.paid, payment.failed, refund.processed. Use the same secret as RAZORPAY_WEBHOOK_SECRET.</p>
        </div>
      </Card>
      <SettingsForm settingKey="payments" values={payments as Record<string, unknown>} groups={[
        { title: "Payment methods at checkout", fields: [
          { name: "onlineEnabled", label: "Online payments (UPI, cards, net banking, wallets via Razorpay)", type: "checkbox", hint: "Only shown when the Razorpay keys are set" },
          { name: "codEnabled", label: "Cash on delivery", type: "checkbox" },
          { name: "codMaxOrder", label: "Maximum order value for COD (₹)", type: "number", hint: "Blank = no limit" },
        ] },
      ]} />
    </div>
  );
}
