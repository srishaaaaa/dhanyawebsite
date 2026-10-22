import { requireSection } from "@/lib/authz";
import PageEditor from "@/components/admin/PageEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "New page" };

export default async function NewPage() {
  await requireSection("pages");
  return <PageEditor initial={{ id: "", title: "", slug: "", body: "", seoTitle: "", seoDescription: "", status: "draft", publishAt: "" }} core={false} canDelete={false} />;
}
