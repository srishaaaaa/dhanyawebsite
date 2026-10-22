import { notFound, redirect } from "next/navigation";
import { getStaff } from "@/lib/authz";
import { getProduct } from "@/lib/catalog/queries";
import ProductView from "@/components/store/ProductView";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, title: "Preview" };

/** Staff-only preview of drafts and scheduled products. */
export default async function PreviewProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getStaff("staff", "products"))) redirect("/admin/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await getProduct({ id }, { includeUnpublished: true });
  if (!p) notFound();
  return <ProductView p={p} preview />;
}
