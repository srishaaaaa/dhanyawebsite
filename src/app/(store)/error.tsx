"use client";
import Link from "next/link";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x py-28 text-center">
      <h1 className="display text-5xl">Something interrupted this page</h1>
      <p className="mx-auto mt-4 max-w-md text-charcoal/70">It may be a connection problem. Your bag and wishlist are safe.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="btn-primary">TRY AGAIN</button>
        <Link href="/" className="btn-outline">HOME</Link>
      </div>
    </div>
  );
}
