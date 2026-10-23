"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, Search, ShoppingBag, User, X } from "lucide-react";
import { useStore } from "./StoreProviders";
import { Wordmark } from "./Wordmark";
import SearchOverlay from "./SearchOverlay";
import Img from "./Img";
import Tilt from "./Tilt";
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
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.current?.style.setProperty("--p", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
      });
    };
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); };
  }, []);
  useEffect(() => { setMenu(false); setSearch(false); setMega(false); }, [path]);
  useEffect(() => {
    if (!mega && !menu) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setMega(false); setMenu(false); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [mega, menu]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menu]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearch(true); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const clear = overHero && !scrolled && !menu && !mega;
  const count = cart?.count ?? 0;
  const hasMega = collections.length > 0;

  return (
    <>
      <AnnouncementBar items={announcements} />
      <header className={`sticky top-0 z-40 text-ivory transition-[background-color,box-shadow,backdrop-filter] duration-700 ${clear ? "bg-transparent" : "bg-plum/90 shadow-[0_20px_40px_-30px_rgba(0,0,0,.6)] backdrop-blur-xl"} ${overHero ? "-mb-[76px]" : ""}`}>
        <div className="mx-auto grid h-[76px] max-w-[1560px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8 lg:px-14">
          <nav aria-label="Main" className="flex items-center gap-8">
            <button className="group flex items-center gap-3 lg:hidden" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="mobile-nav" aria-label={menu ? "Close menu" : "Open menu"}>
              <span aria-hidden className="relative block h-3 w-7">
                <span className={`absolute left-0 h-px bg-current transition-all duration-500 ${menu ? "top-1.5 w-7 rotate-45" : "top-0 w-7"}`} />
                <span className={`absolute left-0 h-px bg-current transition-all duration-500 ${menu ? "top-1.5 w-7 -rotate-45" : "top-3 w-4 group-hover:w-7"}`} />
              </span>
              <span className="hidden text-[11px] uppercase tracking-[0.3em] sm:inline">{menu ? "Close" : "Menu"}</span>
            </button>
            <ul className="hidden items-center gap-9 text-[11.5px] uppercase tracking-[0.26em] lg:flex">
              {nav.map((n) => (
                <li key={n.href} onMouseEnter={() => n.href === "/collections" && hasMega && setMega(true)} onMouseLeave={() => setMega(false)}
                  onFocus={() => n.href === "/collections" && hasMega && setMega(true)}
                  onBlur={(e) => { if (n.href === "/collections" && !(e.relatedTarget as HTMLElement | null)?.closest("[data-mega]")) setMega(false); }}>
                  <Link href={n.href} aria-expanded={n.href === "/collections" && hasMega ? mega : undefined} className={`nav-link ${path.startsWith(n.href) && n.href !== "/" ? "is-active" : ""}`}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link href="/" aria-label={`${logo?.alt ?? "DHANYA BOUTIQUE"} — home`} className="text-[15px] sm:text-[17px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo.url} alt="" className="h-9 w-auto brightness-0 invert sm:h-11" /> : <Wordmark />}
          </Link>
          <div className="flex items-center justify-end gap-4 sm:gap-6">
            <button onClick={() => setSearch(true)} aria-label="Search" className="p-1 transition-transform duration-500 hover:scale-110"><Search size={19} strokeWidth={1.3} /></button>
            <Link href="/account" aria-label="Your account" className="hidden p-1 transition-transform duration-500 hover:scale-110 sm:block"><User size={19} strokeWidth={1.3} /></Link>
            <Link href="/wishlist" aria-label={`Wishlist, ${wishlist.size} items`} className="relative hidden p-1 transition-transform duration-500 hover:scale-110 sm:block">
              <Heart size={19} strokeWidth={1.3} />
              {wishlist.size > 0 && <span className="badge-dot">{wishlist.size}</span>}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${count} items`} className="relative p-1 transition-transform duration-500 hover:scale-110">
              <ShoppingBag size={19} strokeWidth={1.3} />
              {count > 0 && <span key={count} className="badge-dot toast-in">{count}</span>}
            </button>
          </div>
        </div>
        <span ref={bar} aria-hidden className="scroll-progress" />

        {mega && hasMega && (
          <div data-mega onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)} className="stage grain page-enter absolute inset-x-0 top-full hidden border-t border-gold/20 shadow-[0_50px_80px_-40px_rgba(0,0,0,.8)] lg:block">
            <div className="mx-auto grid max-w-[1560px] grid-cols-12 gap-12 px-14 py-12">
              <div className="col-span-3">
                <p className="kicker mb-6">Explore</p>
                <ul className="space-y-3 font-serif text-3xl font-light">
                  <li><Link href="/collections" className="nav-link">All collections</Link></li>
                  <li><Link href="/shop?sort=newest" className="nav-link">New arrivals</Link></li>
                  <li><Link href="/shop" className="nav-link">The full boutique</Link></li>
                </ul>
                {categories.length > 0 && (
                  <>
                    <p className="kicker mb-4 mt-10">Categories</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-ivory/75">
                      {categories.slice(0, 8).map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`} className="nav-link hover:text-ivory">{c.name}</Link></li>)}
                    </ul>
                  </>
                )}
              </div>
              <ul className="col-span-9 grid grid-cols-3 gap-8">
                {collections.slice(0, 3).map((c, i) => (
                  <li key={c.slug}>
                    <Tilt max={5}>
                      <Link href={`/collections/${c.slug}`} data-cursor="EXPLORE" className="group block">
                        <div className="frame relative aspect-[4/5] overflow-hidden bg-burgundy/40">
                          <Img src={c.imageUrl} alt="" sizes="22vw" width={640} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.06]" />
                          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-plum/70 via-transparent to-transparent" />
                        </div>
                        <p data-lift className="mt-4 flex items-baseline gap-3 font-serif text-3xl font-light leading-none"><span className="text-[11px] tracking-[0.3em] text-gold">0{i + 1}</span>{c.title}</p>
                      </Link>
                    </Tilt>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </header>

      {menu && (
        <nav id="mobile-nav" aria-label="Mobile" className="stage grain fixed inset-x-0 bottom-0 top-[76px] z-30 overflow-y-auto lg:hidden" style={{ perspective: 900 }}>
          <ul className="px-7 pb-10 pt-8">
            {[...nav, { label: "Wishlist", href: "/wishlist" }, { label: "Account", href: "/account" }].map((n, i) => (
              <li key={n.href + n.label} className="menu-item border-b border-ivory/10" style={{ animationDelay: `${0.08 + i * 0.07}s` }}>
                <Link href={n.href} className="flex items-baseline justify-between py-4 font-serif text-[2.6rem] font-light leading-none">
                  {n.label}<span className="text-[11px] tracking-[0.3em] text-gold">0{i + 1}</span>
                </Link>
              </li>
            ))}
          </ul>
          {collections.length > 0 && (
            <div className="menu-item px-7 pb-12" style={{ animationDelay: ".7s" }}>
              <p className="kicker mb-5">Collections</p>
              <ul className="rail flex gap-4 overflow-x-auto">
                {collections.slice(0, 6).map((c) => (
                  <li key={c.slug} className="w-36 shrink-0">
                    <Link href={`/collections/${c.slug}`} className="block">
                      <div className="aspect-[3/4] overflow-hidden bg-burgundy/40"><Img src={c.imageUrl} alt="" width={400} sizes="144px" className="h-full w-full object-cover" /></div>
                      <p className="mt-2 font-serif text-lg leading-tight">{c.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => setMenu(false)} className="sr-only"><X /> Close menu</button>
        </nav>
      )}
      {search && <SearchOverlay onClose={() => setSearch(false)} />}
    </>
  );
}
