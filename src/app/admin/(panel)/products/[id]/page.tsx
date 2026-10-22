import { notFound } from "next/navigation";
import { requireSection, hasRole } from "@/lib/authz";
import ProductForm from "@/components/admin/ProductForm";
import { formOptions, loadProductDraft } from "../data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const me = await requireSection("products");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [draft, opts] = await Promise.all([loadProductDraft(id), formOptions()]);
  if (!draft) notFound();
  const { version, ...initial } = draft;
  const notice = sp.saved
    ? initial.status === "active" ? "Saved. Changes are live on the storefront." : "Saved as " + initial.status + ". It isn't visible to shoppers."
    : null;
  return <ProductForm key={`${id}-${version}-${sp.saved ?? ""}`} initial={initial} {...opts} notice={notice} canDelete={hasRole(me.role, "admin")} />;
}
