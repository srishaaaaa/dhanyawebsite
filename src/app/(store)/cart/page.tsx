import type { Metadata } from "next";
import PageHero from "@/components/store/PageHero";
import CartPageClient from "@/components/store/CartPage";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };
export default function CartPage() {
  return (
    <>
      <PageHero compact kicker="Your selection" title="The bag" />
      <div className="container-x py-14 pb-24"><CartPageClient /></div>
    </>
  );
}
