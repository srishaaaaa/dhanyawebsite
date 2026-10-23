import { ArrowUpRight, Clock, MapPin, Phone } from "lucide-react";
import OpenNow from "./OpenNow";
import { Monogram } from "./Wordmark";
import type { StoreInfo } from "@/lib/settings";

/**
 * "Visit us": the boutique's real address (Admin → Settings → Store) beside a live Google map. No API key is needed:
 * the map is the standard embed and the buttons open Google Maps for directions. Renders nothing until an address is saved,
 * so no placeholder location is ever shown.
 */
export default function StoreVisit({ store }: { store: StoreInfo }) {
  const address = store.address?.replace(/\s*\n\s*/g, ", ").trim();
  if (!address) return null;
  const q = encodeURIComponent(`${store.name}, ${address}`);
  const lines = store.address!.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const tel = store.phone?.replace(/[^\d+]/g, "");
  return (
    <section aria-labelledby="visit-h" className="relative bg-ivory px-4 pb-24 pt-8 sm:px-10 lg:px-14">
      <div className="mx-auto grid max-w-[1560px] overflow-hidden border border-gold/40 bg-white shadow-[0_60px_100px_-50px_rgb(var(--c-aubergine)/.5)] lg:grid-cols-[0.8fr_1.2fr]" data-reveal>
        <div className="flex flex-col justify-center gap-10 p-8 sm:p-14">
          <div>
            <p className="kicker mb-6">Visit us</p>
            <h2 id="visit-h" className="display text-[clamp(3rem,6vw,6rem)] text-aubergine">Our <span className="editorial-italic">studio</span></h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-charcoal/65">Experience the collections in person, meet our stylists and discover pieces you will not find online.</p>
          </div>
          <ul className="space-y-6">
            <li className="flex gap-4">
              <MapPin size={18} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" aria-hidden />
              <address className="not-italic">
                <span className="block text-[13px] font-medium uppercase tracking-[0.14em]">{lines[0]}</span>
                {lines.length > 1 && <span className="mt-1 block text-[14px] uppercase tracking-[0.1em] text-charcoal/60">{lines.slice(1).join(", ")}</span>}
              </address>
            </li>
            {(store.hours || (store.openFrom && store.openTo)) && (
              <li className="flex gap-4">
                <Clock size={18} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" aria-hidden />
                <div>
                  {store.hours && <span className="block text-[13px] font-medium uppercase tracking-[0.14em]">{store.hours}</span>}
                  <OpenNow from={store.openFrom} to={store.openTo} className="mt-1" />
                </div>
              </li>
            )}
          </ul>
          <div className="flex flex-wrap gap-3">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noreferrer" data-magnet className="btn-primary">Get directions<span aria-hidden>→</span></a>
            {tel && <a href={`tel:${tel}`} className="btn-outline"><Phone size={14} strokeWidth={1.4} />Call store</a>}
          </div>
        </div>

        <div className="relative min-h-[420px] bg-rose/30 lg:min-h-[620px]">
          <iframe title={`Map showing ${store.name}`} src={`https://maps.google.com/maps?q=${q}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0 [filter:sepia(.18)_saturate(.85)_contrast(1.02)]" allowFullScreen />
          <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer"
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 bg-white px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.24em] shadow-lg transition-colors hover:bg-gold">Open in maps<ArrowUpRight size={13} strokeWidth={1.6} /></a>
          <div className="absolute bottom-4 left-4 right-4 z-10 max-w-sm border border-gold/30 bg-white/95 p-5 shadow-2xl backdrop-blur sm:bottom-6 sm:left-6">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-plum text-gold"><Monogram className="h-8 w-8" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-xl leading-tight">{store.name}</p>
                <p className="truncate text-xs text-charcoal/60">{lines[lines.length - 1]}</p>
              </div>
              <OpenNow from={store.openFrom} to={store.openTo} />
            </div>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between border-t border-charcoal/10 pt-3 text-[10px] font-medium uppercase tracking-[0.24em] hover:text-burgundy">Directions <span aria-hidden>→</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}
