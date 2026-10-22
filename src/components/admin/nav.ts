import {
  LayoutDashboard, Shirt, Tags, Layers, Boxes, ShoppingBag, Users, Percent, LayoutTemplate,
  Megaphone, Star, FileText, Menu, Truck, Landmark, CreditCard, BarChart3, Mail, Settings, ShieldCheck, ScrollText,
} from "lucide-react";

export const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, section: "" },
  { href: "/admin/products", label: "Products", icon: Shirt, section: "products" },
  { href: "/admin/categories", label: "Categories", icon: Tags, section: "categories" },
  { href: "/admin/collections", label: "Collections", icon: Layers, section: "collections" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, section: "inventory" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, section: "orders" },
  { href: "/admin/customers", label: "Customers", icon: Users, section: "customers" },
  { href: "/admin/discounts", label: "Discounts & Coupons", icon: Percent, section: "discounts" },
  { href: "/admin/homepage", label: "Homepage Builder", icon: LayoutTemplate, section: "homepage" },
  { href: "/admin/campaigns", label: "Campaigns & Banners", icon: Megaphone, section: "campaigns" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, section: "reviews" },
  { href: "/admin/pages", label: "Content & Pages", icon: FileText, section: "pages" },
  { href: "/admin/navigation", label: "Navigation Menus", icon: Menu, section: "navigation" },
  { href: "/admin/shipping", label: "Shipping", icon: Truck, section: "shipping" },
  { href: "/admin/taxes", label: "Taxes", icon: Landmark, section: "taxes" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, section: "payments" },
  { href: "/admin/analytics", label: "Reports & Analytics", icon: BarChart3, section: "analytics" },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail, section: "newsletter" },
  { href: "/admin/settings", label: "Store Settings", icon: Settings, section: "settings" },
  { href: "/admin/staff", label: "Staff & Permissions", icon: ShieldCheck, section: "staff" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, section: "audit-logs" },
] as const;

// Which phase builds each section (for the placeholder screen).
export const PHASE: Record<string, number> = { analytics: 7, staff: 7 };
