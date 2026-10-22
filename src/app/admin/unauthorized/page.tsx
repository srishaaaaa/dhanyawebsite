import Link from "next/link";
export default function Unauthorized() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
      <h1 className="font-serif text-4xl text-aubergine">Access denied</h1>
      <p className="text-charcoal/70">Your account doesn’t have permission to view the admin area.</p>
      <Link href="/" className="underline">Back to store</Link>
    </main>
  );
}
