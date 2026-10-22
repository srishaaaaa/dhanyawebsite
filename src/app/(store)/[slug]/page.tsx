import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CORE_PAGES, getPublishedPage } from "@/lib/pages";
import { renderMarkdown } from "@/lib/markdown";

export const revalidate = 60;
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublishedPage(slug);
  if (!p && !CORE_PAGES[slug]) return { title: "Page not found" };
  return { title: p?.seoTitle ?? p?.title ?? CORE_PAGES[slug], description: p?.seoDescription ?? undefined, alternates: { canonical: `/${slug}` },
    robots: p ? undefined : { index: false } };
}

/** CMS pages (policies, About, custom landing pages) managed in Admin → Content & Pages. */
export default async function CmsPage({ params }: P) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const p = await getPublishedPage(slug);
  if (!p && !CORE_PAGES[slug]) notFound();
  return (
    <article className="container-x py-16 pb-28">
      <header className="mb-12 max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-xs text-charcoal/55"><Link href="/" className="hover:text-aubergine">Home</Link> / <span aria-current="page">{p?.title ?? CORE_PAGES[slug]}</span></nav>
        <h1 className="display mt-6 text-5xl sm:text-7xl">{p?.title ?? CORE_PAGES[slug]}</h1>
        {p && <p className="mt-4 text-xs text-charcoal/50">Last updated {p.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
      </header>
      {p && p.body.trim() ? (
        <div className="prose-dhanya" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      ) : (
        <div className="max-w-xl">
          <p className="text-charcoal/70">This page is being prepared. For anything you need in the meantime, our team is happy to help.</p>
          <Link href="/contact" className="btn-outline mt-8">Contact us</Link>
        </div>
      )}
    </article>
  );
}
