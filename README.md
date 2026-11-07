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

Landing components live in `components/landing/`. Normal/Pro uses Radix tabs and a single synthetic sample. The Witness examples are read-only. The landing page self-hosts Inter variable (SIL Open Font License in `public/fonts/`) and uses GSAP core for short, one-time entrances. It has no continuous loops, scroll listeners, 3D renderer, or external media requests. Motion is skipped for reduced-motion and data-saver preferences; all content is visible before animation loads. Theme follows the device unless a light/dark preference is saved locally under `bara-landing-theme`. Theme and fonts are scoped to this page.

The existing dashboard lives in `components/intelligence/`, with its original route-scoped styles in `app/intelligence/intelligence.css`. Its application code is unchanged by the landing redesign.

The shared adapter and validated frontend types are in `lib/intelligence.ts`; its complete synthetic dataset is `public/data/intelligence-demo.json`. Refresh requests that file again. Receipt-time windows use its fixed reference clock, 18 August 2026 at 16:00 WIB. Area and receipt period are URL values; search and coordinates stay out of URLs. Pro in the application remains unavailable; the landing page’s local Pro preview does not enable it.

Inter is subset locally to Latin/Latin Extended, punctuation and currency symbols for this English iteration (151 KB WOFF2, down from 352 KB). Expand the subset before adding other scripts. Late-loaded GSAP skips hero entrances after 1.5 seconds so slow connections do not move text already being read.

The observation map uses OpenStreetMap raster tiles with attribution, zoom and pan controls. Network access is required for the basemap; if tiles fail, selectable observation positions and the report list remain available. Positions in the fixtures are synthetic. A future service adapter must supply only data authorized for the viewer; client-side display checks are not access control.
