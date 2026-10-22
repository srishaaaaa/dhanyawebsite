import Link from "next/link";
import Img from "../Img";

/** Quiet ivory pause after the 3D opening: oversized type that slides against itself, framed photography, one concise statement. */
export default function EditorialIntro({ heading, body, images, cta }: { heading: string; body: string; images: string[]; cta?: { label: string; href: string } }) {
  const words = heading.replace(/[.]+$/, "").split(" ");
  const mid = Math.ceil(words.length / 2);
  const lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  return (
    <section aria-label="Introduction to the boutique" className="relative overflow-hidden bg-ivory py-24 sm:py-36">
      <div aria-hidden className="select-none whitespace-nowrap font-serif font-light leading-[0.9] text-aubergine/[0.07] text-[clamp(5rem,17vw,16rem)]">
        <div data-slide="l">{lines[0]}</div>
        <div data-slide="r" className="text-right">{lines[1]}</div>
      </div>
      <div className="container-x -mt-[10vw] grid items-start gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5 lg:pt-24">
          <h2 className="display text-4xl text-aubergine sm:text-6xl" data-reveal>{heading}</h2>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-charcoal/75" data-reveal>{body}</p>
          {cta?.label && <Link href={cta.href} className="btn-outline mt-10" data-reveal>{cta.label}</Link>}
        </div>
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-5 lg:col-span-6 lg:col-start-7">
            {images.slice(0, 2).map((src, i) => (
              <div key={src + i} className={i === 1 ? "mt-16 sm:mt-28" : ""} data-depth={i === 0 ? "0.12" : "0.22"}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-t-[999px] bg-rose/50" data-reveal="mask">
                  <Img src={src} alt="" sizes="(min-width:1024px) 22vw, 45vw" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
