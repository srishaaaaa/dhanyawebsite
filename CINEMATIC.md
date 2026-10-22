# Cinematic layer — what changed

- `src/components/store/stage/CoutureScene.tsx` — one R3F canvas: silk chamber, gold arch gateways (extruded geometry), campaign image mapped inside the main arch, clickable collection gateways, particles, scroll-linked camera dolly through the arch.
- `src/components/store/stage/CoutureStage.tsx` — loads the scene lazily; WebGL / small-screen / data-saver / reduced-motion / load-failure fallback to 2D silk + HTML arch; "Flat view" toggle (persisted); accessible "Step into" collection links.
- `src/components/store/home/HomeMotion.tsx` — GSAP ScrollTrigger (scrubbed, no pinning, full revert on unmount, skipped for reduced motion).
- `SilkCurtain.tsx`, `EditorialIntro.tsx` — silk curtain divider and the ivory editorial pause after the hero.
- `Header.tsx` — editorial collections mega-menu (hover, focus, Esc).
- `app/(store)/template.tsx` — short route transition.
- Default hero copy updated in `lib/homepage-schema.ts` (existing published hero content in the DB is unchanged; edit it in Admin → Homepage).

Not done / needs you: Vercel deploy and Razorpay sandbox test (need your accounts), Playwright run (needs your DB), the 3D product viewer, and a visual check in a real browser.
Run `npm install` first (gsap added).

## 3D Studio (`/studio/[slug]`)
- `components/store/studio/StudioScene.tsx` + `StudioView.tsx`; linked from every product page ("ENTER 3D STUDIO").
- Drag / wheel / pinch / arrow keys, Front-Back-Detail views, zoom, reset, three lighting presets.
- Uses the product's uploaded GLB (`model3dUrl`) if present; otherwise a labelled silk-drape COLOUR preview tinted with the selected variant colour. No WebGL → real product photos.
- Colour, size, price, stock, wishlist and Add to bag come from the existing `VariantPicker`/cart (no new commerce logic).
- Not built: fabric/embroidery/blouse/border options (the data model has no such options), 3D garments (no assets).
