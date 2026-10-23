import Link from "next/link";
import SilkField from "./silk/SilkField";
import { Wordmark } from "./Wordmark";

/** Split screen for sign-in, registration and password screens: a silk-lit room on the left, the form on ivory on the right. */
export default function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[78vh] lg:grid-cols-[1fr_1fr]">
      <aside aria-hidden className="stage grain relative isolate hidden overflow-hidden lg:block">
        <SilkField tone="plum" className="-z-10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-plum/70 to-transparent" />
        <div className="flex h-full flex-col items-center justify-between p-14 text-center">
          <Link href="/" tabIndex={-1} className="text-xl"><Wordmark /></Link>
          <p className="max-w-sm font-serif text-5xl font-light leading-[1.05]">An art of elegance, <span className="editorial-italic metal-text">woven into you.</span></p>
          <p className="text-[10px] uppercase tracking-[0.4em] text-ivory/50">The Silk Universe</p>
        </div>
      </aside>
      <div className="grid place-items-center px-6 py-16 sm:px-12">
        <div className="w-full max-w-sm">
          <p className="kicker mb-6 !text-burgundy">Your account</p>
          <h1 className="display mb-10 text-[clamp(2.6rem,4vw,4rem)] text-aubergine">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
