import type { Metadata } from "next";
import PageHero from "@/components/store/PageHero";
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
    <article>
      <PageHero crumbs={[{ label: "Home", href: "/" }, { label: p?.title ?? CORE_PAGES[slug] }]} title={p?.title ?? CORE_PAGES[slug]} intro={p ? `Last updated ${p.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : undefined} />
      <div className="container-x py-20 pb-28">
      {p && p.body.trim() ? (
        <div className="prose-dhanya" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      ) : (
        <div className="max-w-xl">
          <p className="text-charcoal/70">This page is being prepared. For anything you need in the meantime, our team is happy to help.</p>
          <Link href="/contact" className="btn-outline mt-8">Contact us</Link>
        </div>
      )}
      </div>
    </article>
  );
}
