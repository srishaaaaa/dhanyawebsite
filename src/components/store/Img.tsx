import { imgSrcSet, imgUrl } from "@/lib/image";

/** Responsive image with a branded fallback when the URL is missing. */
export default function Img({ src, alt, sizes = "100vw", className = "", priority = false, width = 1280 }: {
  src: string | null | undefined; alt: string; sizes?: string; className?: string; priority?: boolean; width?: number;
}) {
  if (!src) {
    return (
      <div role="img" aria-label={alt} className={`flex items-center justify-center bg-gradient-to-br from-rose to-ivory ${className}`}>
        <span className="font-serif text-3xl tracking-wordmark text-burgundy/30" aria-hidden>DB</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imgUrl(src, width)} srcSet={imgSrcSet(src)} sizes={sizes} alt={alt} className={className}
      loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : undefined} />
  );
}
