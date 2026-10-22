"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, LogOut, Search } from "lucide-react";
import { NAV } from "./nav";

type Props = {
  children: React.ReactNode;
  user: { name: string | null; email: string; role: string };
  allowed: string[];            // sections this role may see (UI only; server enforces)
  logout: () => Promise<void>;
};

export default function AdminShell({ children, user, allowed, logout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = usePathname();
  const items = NAV.filter((n) => n.section === "" || allowed.includes(n.section));
  const current = items.find((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href)));

  return (
    <div className="min-h-screen bg-ivory flex">
      <aside className={`${collapsed ? "w-16" : "w-64"} ${mobileOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden md:flex"} shrink-0 flex-col bg-aubergine text-ivory transition-[width] duration-200`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
          {!collapsed && <span className="font-serif text-xl tracking-wordmark">DHANYA</span>}
          <button onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar" className="hidden md:block text-gold">
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3" aria-label="Admin">
          {items.map(({ href, label, icon: Icon }) => {
            const active = current?.href === href;
            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} title={label}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm ${active ? "bg-burgundy text-gold" : "text-ivory/80 hover:bg-white/5"}`}>
                <Icon size={17} />{!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-charcoal/10 flex items-center gap-3 px-4">
          <button className="md:hidden text-sm underline" onClick={() => setMobileOpen(true)}>Menu</button>
          <nav aria-label="Breadcrumb" className="text-sm text-charcoal/60 hidden sm:block">
            Admin / <span className="text-charcoal">{current?.label ?? "Overview"}</span>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <form action="/admin/products" role="search" className="hidden md:flex items-center gap-2 border border-charcoal/15 px-3 py-1.5 text-sm">
              <Search size={14} aria-hidden /><input name="q" aria-label="Search products by name or SKU" placeholder="Search products or SKU" className="bg-transparent outline-none w-44" />
            </form>
            <a href="/" target="_blank" rel="noreferrer" className="hidden sm:inline text-sm text-charcoal/70 hover:text-aubergine">View store</a>
            <Link href="/admin/account" className="text-right leading-tight hover:text-aubergine" title="My account">
              <p className="text-sm">{user.name ?? user.email}</p>
              <p className="text-[11px] uppercase tracking-widest text-gold">{user.role}</p>
            </Link>
            <form action={logout}>
              <button aria-label="Sign out" title="Sign out" className="text-charcoal/70 hover:text-burgundy"><LogOut size={18} /></button>
            </form>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
