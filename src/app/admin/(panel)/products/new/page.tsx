import { requireSection, hasRole } from "@/lib/authz";
import ProductForm, { EMPTY_PRODUCT } from "@/components/admin/ProductForm";
import { formOptions } from "../data";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product" };

export default async function NewProduct() {
  const me = await requireSection("products");
  const opts = await formOptions();
  return <ProductForm initial={EMPTY_PRODUCT} {...opts} canDelete={hasRole(me.role, "admin")} />;
}
