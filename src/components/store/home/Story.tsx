"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Img from "../Img";
import type { StoryContent } from "@/lib/homepage-schema";

/** Editorial chapter on ivory: layered photographs drift at different speeds, the pull quote reveals word by word. */
export default function Story({ c, images = [] }: { c: StoryContent; images?: string[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yA = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -60]);
  const yB = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-30, 90]);
  const [a, b, wide] = [c.image || images[0], images[1], images[2] || images[0]];
  const yWide = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-40, 40]);
  const quote = "Dressing beautifully is a quiet kind of confidence.".split(" ");
  return (
    <section ref={ref} aria-labelledby="story-h" className="relative overflow-hidden bg-ivory py-24 sm:py-36">
      <div className="container-x grid items-center gap-16 lg:grid-cols-12">
        <div className="relative min-h-[420px] lg:col-span-6 lg:min-h-[640px]">
          {a && <motion.div style={{ y: yA }} className="frame absolute left-0 top-0 w-[68%] overflow-hidden" data-reveal="mask">
            <Img src={a} alt={c.imageAlt ?? ""} sizes="(min-width:1024px) 30vw, 60vw" width={900} className="aspect-[3/4] w-full object-cover" /></motion.div>}
          {b && <motion.div style={{ y: yB }} className="absolute bottom-0 right-0 w-[46%] border-[10px] border-ivory shadow-2xl" data-reveal="mask-x">
            <Img src={b} alt="" sizes="(min-width:1024px) 22vw, 40vw" width={700} className="aspect-[4/5] w-full object-cover" /></motion.div>}
        </div>
        <div className="lg:col-span-6 lg:pl-8">
          <p className="kicker mb-8" data-reveal>Our story</p>
          <h2 id="story-h" className="display text-[clamp(2.8rem,6vw,6rem)] text-aubergine" data-reveal>{c.heading.split(" ").slice(0, -2).join(" ")} <span className="editorial-italic text-gold">{c.heading.split(" ").slice(-2).join(" ")}</span></h2>
          <p className="mt-10 max-w-xl text-lg leading-relaxed text-charcoal/75" data-reveal>{c.body}</p>
          <blockquote className="mt-12 border-l border-gold pl-6 font-serif text-3xl font-light italic leading-snug text-burgundy sm:text-4xl">
            {quote.map((w, i) => (
              <motion.span key={i} className="mr-[0.25em] inline-block" initial={reduce ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }} transition={{ delay: i * 0.07, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>{w}</motion.span>
            ))}
          </blockquote>
          {c.cta?.label && <Link href={c.cta.href} data-magnet className="btn-primary mt-12">{c.cta.label}<span aria-hidden>→</span></Link>}
        </div>
      </div>
      {wide && <div className="container-x mt-24" data-reveal="mask"><div className="relative h-[46vh] min-h-[280px] overflow-hidden">
        <motion.div style={{ y: yWide }} className="absolute -inset-y-10 inset-x-0">
          <Img src={wide} alt="" sizes="100vw" width={1800} className="h-full w-full object-cover" /></motion.div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-plum/40 to-transparent" />
      </div></div>}
    </section>
  );
}
