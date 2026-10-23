import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { getBrand, brandVars } from "@/lib/brand";

// Two choices per role; only the selected pair is applied (and preloaded).
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getBrand();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: "DHANYA BOUTIQUE — Elegance, Woven Into You", template: "%s | DHANYA BOUTIQUE" },
    description: "Thoughtfully curated styles that celebrate your individuality.",
    openGraph: { siteName: "DHANYA BOUTIQUE", locale: "en_IN", type: "website" },
    ...(brand.faviconUrl ? { icons: { icon: brand.faviconUrl } } : {}),
  };
}

export async function generateViewport() {
  const { brand } = await getBrand();
  return { themeColor: brand.colors.aubergine };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand } = await getBrand();
  const fonts = `${brand.serif === "playfair" ? playfair.variable : cormorant.variable} ${brand.sans === "inter" ? inter.variable : manrope.variable}`;
  return (
    <html lang="en-IN" className={fonts} style={brandVars(brand.colors) as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
