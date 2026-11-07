# BARA landing page

English landing page and a working Normal Intelligence dashboard at `/intelligence`. Intelligence uses explicitly synthetic records; Witness remains an illustrative landing-page preview. No backend, authentication, AI analysis, or report submission is implemented.

Requires Node.js 24 (the built-in test runner loads TypeScript data directly) and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000 on this computer. This address is not a phone-accessible deployment.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The home route is `app/page.tsx`; its redesign is scoped in `app/landing.css`. Shared base styles remain in `app/globals.css` for the existing application. English copy and the labeled synthetic report `BARA-DEMO-0042` live in `lib/content.ts`. Exploration links use the real `#intelligence`, `#witness`, and `#how-it-works` sections. A separate Open Intelligence demo action uses the verified destination from `lib/destinations.ts`.

Landing components live in `components/landing/`; the reusable parallax composition lives in `components/ui/parallax-scrolling.tsx`, with a usage example in `components/ui/demo.tsx`. The Witness examples are read-only. The landing page self-hosts Inter variable (SIL Open Font License in `public/fonts/`). GSAP ScrollTrigger drives section reveals and the layered BARA wordmark/phone between the opening copy and section 01. Lenis smooths wheel scrolling on the landing route; touch and keyboard scrolling remain native. Reduced-motion and data-saver preferences disable motion. Cleanup removes this component's ticker, scrolling instance, and triggers without affecting other animations. Theme follows the device unless a light/dark preference is saved locally under `bara-landing-theme`.

## Component structure and optional Tailwind/shadcn setup

TypeScript is already configured. Global styles are in `app/globals.css`, and the landing design is in `app/landing.css`. This component uses those existing styles, requires no props or provider, and reuses the local wordmark and Witness device rather than remote image layers. Its layout follows the landing page's desktop/mobile breakpoints. The supplied animation pattern is adapted from [Osmo](https://www.osmo.supply/).

`components/ui/` is the conventional destination for copied shadcn components, keeping reusable UI separate from feature components. This repository does not currently use Tailwind or the shadcn CLI; neither is required by this plain-CSS component. To adopt them later, following the [shadcn installation guide](https://ui.shadcn.com/docs/installation/next):

1. Run `npm install -D tailwindcss @tailwindcss/postcss`.
2. Create `postcss.config.mjs` exporting `export default { plugins: { "@tailwindcss/postcss": {} } };`.
3. Add `@import "tailwindcss";` at the beginning of `app/globals.css` (already imported by the layout). Check existing styles against Tailwind's base reset before shipping.
4. Add `"paths": { "@/*": ["./*"] }` to `compilerOptions` in `tsconfig.json`.
5. Run `npx shadcn@latest init`. Use `app/globals.css` for CSS, `@/components/ui` for UI components, and Lucide for icons. Review generated styles to preserve BARA's colors and type. For Tailwind v4, the Tailwind config path in `components.json` stays empty.

The requested `@studio-freight/lenis` package is installed at 1.0.42. npm marks that package name deprecated in favor of `lenis`; this integration retains the requested import rather than migrating dependencies.

The existing dashboard lives in `components/intelligence/`, with its original route-scoped styles in `app/intelligence/intelligence.css`. Its application code is unchanged by the landing redesign.

The shared adapter and validated frontend types are in `lib/intelligence.ts`; its complete synthetic dataset is `public/data/intelligence-demo.json`. Refresh requests that file again. Receipt-time windows use its fixed reference clock, 18 August 2026 at 16:00 WIB. Area and receipt period are URL values; search and coordinates stay out of URLs. Pro in the application remains unavailable; the landing page’s local Pro preview does not enable it.

Inter is subset locally to Latin/Latin Extended, punctuation and currency symbols for this English iteration (151 KB WOFF2, down from 352 KB). Expand the subset before adding other scripts. Late-loaded GSAP skips hero entrances after 1.5 seconds so slow connections do not move text already being read.

The observation map uses OpenStreetMap raster tiles with attribution, zoom and pan controls. Network access is required for the basemap; if tiles fail, selectable observation positions and the report list remain available. Positions in the fixtures are synthetic. A future service adapter must supply only data authorized for the viewer; client-side display checks are not access control.
