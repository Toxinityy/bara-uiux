# BARA landing page

## Local Docker preview

With Docker Desktop and the existing BARA infrastructure running:

```sh
docker compose up -d --build
```

Open http://localhost:3003 or http://localhost:3003/witness. Ports 3000 (API), 3001 (existing Witness), and 3002 (Intelligence) remain assigned to the existing apps. This container uses Node.js 24 and joins the existing `bara-data` network.

Requests to `/api/backend/:path` proxy to `http://api:3000/:path`, for example `/api/backend/sessions`. Witness uses this same-origin path for session creation, status checks, ending, and photo submission, including from a phone. No browser cross-origin API access is required. The proxy allows 95 seconds for backend analysis and instruction generation.

At `/witness`, GPS and compass start automatically, subject to device support and browser permissions. On phones that require a tap for compass permission, Open camera or Start session retries the permission request. Both sensors retain their stop/retry controls. Start a session in Controls and open the camera. Snap enables after the session, live camera, location, and absolute heading are ready. Each tap sends one JPEG (maximum 1600 pixels on its longest side) with session ID, capture time, latitude, longitude, and direction. The existing instruction area displays the backend result. Session actions and capture are mutually exclusive while a request is in progress. Active sessions are remembered per tab and verified after reload; leaving the page stops devices but does not end the session. Use End session to finish it.

The topic coverage UI is not yet connected to the backend checklist; uploaded evidence and assessments are available in the existing Intelligence app on port 3002.

To target a service running directly on the PC, copy `.env.example` to `.env`, set `API_BASE_URL=http://host.docker.internal:3000`, and rebuild. The proxy destination is embedded at build time. Container-side code can also reach other PC services through `host.docker.internal`; other BARA containers are reachable by their service names on `bara-data`.

```sh
docker compose logs -f ui
docker compose down
```

Camera and location require a secure browser context: desktop localhost works; phone access over a LAN address requires HTTPS.

English landing page, a synthetic Normal Intelligence demo at `/intelligence`, and a live Witness client at `/witness` connected to the existing BARA backend. Authentication is not implemented.

Requires Node.js 24 (the built-in test runner loads TypeScript data directly) and npm.

```sh
npm install
npm run dev -- --port 3003
```

Open http://localhost:3003 on this computer. For development outside Docker, the proxy defaults to the API at http://localhost:3000. This address is not a phone-accessible deployment.

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
