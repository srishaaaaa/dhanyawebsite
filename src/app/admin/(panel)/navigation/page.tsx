import { db } from "@/db";
import { navigationMenus } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { PageHeader } from "@/components/admin/ui";
import MenuEditor from "@/components/admin/MenuEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Navigation" };
type Item = { label: string; href: string };

export default async function NavigationPage() {
  await requireSection("navigation", "admin");
  const rows = await db.select().from(navigationMenus);
  const get = (l: string) => (rows.find((r) => r.location === l)?.items as Item[] | undefined) ?? [];
  return (
    <div className="space-y-8">
      <PageHeader title="Navigation menus" description="The header menu replaces the default (Shop all · Collections · Our story) when it has links. Footer links are added to the “The house” column; help and policy links are always shown." />
      <div className="grid gap-6 xl:grid-cols-2">
        <MenuEditor location="header" title="Header menu" initial={get("header")} />
        <MenuEditor location="footer" title="Footer — extra links" initial={get("footer")} />
      </div>
    </div>
  );
}
