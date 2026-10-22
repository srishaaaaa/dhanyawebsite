import type { Metadata } from "next";
import CartPageClient from "@/components/store/CartPage";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };
export default function CartPage() {
  return (
    <div className="container-x py-12">
      <h1 className="display text-5xl sm:text-6xl mb-10">Your bag</h1>
      <CartPageClient />
    </div>
  );
}
