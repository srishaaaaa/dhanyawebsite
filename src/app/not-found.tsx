import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-aubergine px-6 text-center text-ivory">
      <p className="font-serif text-8xl font-light text-gold">404</p>
      <h1 className="mt-6 font-serif text-4xl">This page has slipped away</h1>
      <p className="mt-4 max-w-md text-ivory/70">The link may be old, or the piece may no longer be available.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary bg-ivory text-aubergine hover:bg-gold">SHOP THE COLLECTION</Link>
        <Link href="/" className="btn-ghost-light">HOME</Link>
      </div>
    </main>
  );
}
