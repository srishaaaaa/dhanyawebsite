import { redirect } from "next/navigation";
import { getStaff } from "@/lib/authz";
import { getDraftForPreview } from "@/lib/homepage";
import HomeView from "@/components/store/home/HomeView";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, title: "Homepage preview" };

/** Staff-only render of the unpublished homepage draft. */
export default async function PreviewHome() {
  if (!(await getStaff("staff", "homepage"))) redirect("/admin/login");
  return (
    <>
      <p className="fixed bottom-4 left-4 z-[60] bg-gold px-3 py-1.5 text-xs text-aubergine shadow">Draft preview — not visible to shoppers</p>
      <HomeView sections={await getDraftForPreview()} />
    </>
  );
}
