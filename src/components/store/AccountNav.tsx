import Link from "next/link";
import { logout } from "@/app/(store)/account/actions";

const LINKS = [["/account", "Profile"], ["/account/orders", "Orders"], ["/account/addresses", "Addresses"], ["/wishlist", "Wishlist"]] as const;

export default function AccountLayout({ active, name, children }: { active: string; name: string | null; children: React.ReactNode }) {
  return (
    <div className="container-x py-12 pb-24">
      <h1 className="display text-5xl sm:text-6xl">{name ? `Hello, ${name.split(" ")[0]}` : "Your account"}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Account" className="flex flex-wrap gap-x-6 gap-y-2 text-sm lg:flex-col">
          {LINKS.map(([href, label]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className={`nav-link self-start ${active === href ? "is-active" : ""}`}>{label}</Link>)}
          <form action={logout}><button className="text-sm text-charcoal/60 hover:text-burgundy">Sign out</button></form>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
