"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useStore } from "./StoreProviders";
import { Wordmark } from "./Wordmark";
import SearchOverlay from "./SearchOverlay";
import Img from "./Img";
import AnnouncementBar, { type Announcement } from "./AnnouncementBar";

export type NavItem = { label: string; href: string };

export type MegaCollection = { title: string; slug: string; imageUrl: string | null };
export type MegaCategory = { name: string; slug: string };

export default function Header({ nav, announcements, logo, collections = [], categories = [] }: { nav: NavItem[]; announcements: Announcement[]; logo?: { url: string; alt: string } | null; collections?: MegaCollection[]; categories?: MegaCategory[] }) {
  const { cart, setCartOpen, wishlist } = useStore();
  const path = usePathname();
  const overHero = path === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [mega, setMega] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { setMenu(false); setSearch(false); setMega(false); }, [path]);
  useEffect(() => {
    if (!mega) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setMega(false); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [mega]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearch(true); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const clear = overHero && !scrolled && !menu && !mega;
  const count = cart?.count ?? 0;

  return (
    <>
      <AnnouncementBar items={announcements} />
      <header className={`sticky top-0 z-40 transition-colors duration-500 ${clear ? "bg-transparent text-ivory" : "bg-ivory/95 text-charcoal backdrop-blur border-b border-charcoal/10"} ${overHero ? "-mb-[72px]" : ""}`}>
        <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8">
          <nav aria-label="Main" className="flex items-center gap-7">
            <button className="lg:hidden -ml-1 p-1" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="mobile-nav" aria-label={menu ? "Close menu" : "Open menu"}>
              {menu ? <X size={22} strokeWidth={1.4} /> : <Menu size={22} strokeWidth={1.4} />}
            </button>
            <ul className="hidden lg:flex items-center gap-7 text-[13px] tracking-wide">
              {nav.map((n) => (
                <li key={n.href} onMouseEnter={() => n.href === "/collections" && collections.length > 0 && setMega(true)} onMouseLeave={() => setMega(false)}
                  onFocus={() => n.href === "/collections" && collections.length > 0 && setMega(true)}
                  onBlur={(e) => { if (n.href === "/collections" && !(e.relatedTarget as HTMLElement | null)?.closest("[data-mega]")) setMega(false); }}>
                  <Link href={n.href} aria-expanded={n.href === "/collections" && collections.length > 0 ? mega : undefined} className={`nav-link ${path.startsWith(n.href) && n.href !== "/" ? "is-active" : ""}`}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link href="/" aria-label={`${logo?.alt ?? "DHANYA BOUTIQUE"} — home`} className="text-[15px] sm:text-[17px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo.url} alt="" className={`h-9 w-auto sm:h-11 ${clear ? "brightness-0 invert" : ""}`} /> : <Wordmark />}
          </Link>
          <div className="flex items-center justify-end gap-4 sm:gap-5">
            <button onClick={() => setSearch(true)} aria-label="Search" className="p-1"><Search size={20} strokeWidth={1.4} /></button>
            <Link href="/account" aria-label="Your account" className="hidden p-1 sm:block"><User size={20} strokeWidth={1.4} /></Link>
            <Link href="/wishlist" aria-label={`Wishlist, ${wishlist.size} items`} className="relative p-1 hidden sm:block">
              <Heart size={20} strokeWidth={1.4} />
              {wishlist.size > 0 && <span className="badge-dot">{wishlist.size}</span>}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${count} items`} className="relative p-1">
              <ShoppingBag size={20} strokeWidth={1.4} />
              {count > 0 && <span className="badge-dot">{count}</span>}
            </button>
          </div>
        </div>
        {mega && collections.length > 0 && (
          <div data-mega onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)} className="page-enter absolute inset-x-0 top-full hidden border-t border-charcoal/10 bg-ivory text-charcoal shadow-[0_40px_60px_-40px_rgba(33,29,32,.35)] lg:block">
            <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-10 px-8 py-10">
              <div className="col-span-3">
                <p className="mb-4 text-[11px] tracking-[0.3em] text-gold">EXPLORE</p>
                <ul className="space-y-2 font-serif text-2xl">
                  <li><Link href="/collections" className="nav-link">All collections</Link></li>
                  <li><Link href="/shop?sort=newest" className="nav-link">New arrivals</Link></li>
                  <li><Link href="/shop" className="nav-link">The full boutique</Link></li>
                </ul>
                {categories.length > 0 && (
                  <>
                    <p className="mb-3 mt-8 text-[11px] tracking-[0.3em] text-gold">CATEGORIES</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      {categories.slice(0, 8).map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`} className="nav-link">{c.name}</Link></li>)}
                    </ul>
                  </>
                )}
              </div>
              <ul className="col-span-9 grid grid-cols-3 gap-6">
                {collections.slice(0, 3).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/collections/${c.slug}`} className="group depth-card block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-rose/50">
                        <Img src={c.imageUrl} alt="" sizes="22vw" width={640} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.05]" />
                      </div>
                      <p className="mt-3 font-serif text-2xl leading-none">{c.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {menu && (
          <nav id="mobile-nav" aria-label="Mobile" className="lg:hidden border-t border-charcoal/10 bg-ivory text-charcoal h-[calc(100dvh-72px)] overflow-y-auto">
            <ul className="px-6 py-6 space-y-1">
              {nav.map((n) => <li key={n.href}><Link href={n.href} className="block py-3 font-serif text-3xl">{n.label}</Link></li>)}
              <li><Link href="/wishlist" className="block py-3 font-serif text-3xl">Wishlist</Link></li>
              <li><Link href="/account" className="block py-3 font-serif text-3xl">Account</Link></li>
            </ul>
          </nav>
        )}
      </header>
      {search && <SearchOverlay onClose={() => setSearch(false)} />}
    </>
  );
}
