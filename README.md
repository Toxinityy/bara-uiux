# BARA landing page

English landing page, a shared Normal/Pro Intelligence workspace at `/intelligence`, and a connected Witness client at `/witness`. Intelligence uses synthetic capture-session and analysis examples aligned with [the backend handoff](public/UI-BACKEND-HANDOFF.md); its backend connection is not implemented. Witness connects to the existing BARA backend through the configured same-origin proxy. Authentication is not implemented.

## Local Docker preview

With Docker Desktop and the existing BARA infrastructure running:

```sh
docker compose up -d --build
```

Open http://localhost:3003 or http://localhost:3003/witness. Ports 3000 (API), 3001 (existing Witness), and 3002 (Intelligence) remain assigned to the existing apps. This container uses Node.js 24 and joins the existing `bara-data` network.

Requests to `/api/backend/:path` proxy to `http://api:3000/:path`, for example `/api/backend/sessions`. Witness uses this same-origin path for session creation, status checks, ending, and photo submission, including from a phone. No browser cross-origin API access is required. The proxy allows 95 seconds for backend analysis and instruction generation.

At `/witness`, Open camera starts or resumes an observation session and opens the camera in one tap. GPS and compass start automatically, subject to device support and browser permissions. On phones that require a tap for compass permission, Open camera or the compass button retries the permission request. The compact bottom buttons directly stop or enable the sensors; there is no controls modal. Criteria appear as small circles, with details available on tap. Snap enables after the session, live camera, location, and absolute heading are ready. Each tap sends one JPEG (maximum 1600 pixels on its longest side) with session ID, capture time, latitude, longitude, and direction. The instruction area displays the backend result. Session actions and capture are mutually exclusive while a request is in progress. Active sessions are remembered per tab and verified after reload; leaving or closing the camera does not end the session. End session in the slim top strip finishes it and closes the camera.

The criteria rail uses the backend checklist. Dots turn green only for `resolved` items; uncertain, unavailable, or unassessed items remain hollow. A newly confirmed criterion expands into a labeled green indicator for four seconds, then collapses to its green dot. Several confirmations can expand together. Repeated refreshes and restoring already-confirmed criteria do not replay the highlight. Updates apply after captures, session restoration, and a five-second refresh while a session is active. The rail matches the backend's actual criteria rather than the original seven illustrative topics. Distance prompts and the distance indicator are omitted.

Skip request dismisses the current instruction in one tap, without a reason or confirmation. The backend remembers the declined information gap for the session and chooses another eligible request. Skipping never marks a criterion confirmed. If all eligible requests have been skipped, no further request is shown; existing evidence remains unchanged.

Ending a session opens a simple recap with photos saved, session duration, confirmed findings, and topics still unclear, unavailable, or unassessed. Camera, GPS, and compass are released when the recap opens. Findings use the saved backend checklist; skipping a request or not seeing something in a photo never counts as confirmation. Photo totals come from the stored snapshots, including photos awaiting assessment. The recap refreshes every five seconds for late results, keeps available findings on a refresh failure, and offers a retry. Reloading the same tab restores the last completed recap without activating device sensors. Start new session returns to camera setup; Open camera then creates the next session. No additional AI request is made to write the recap.

To target a service running directly on the PC, copy `.env.example` to `.env`, set `API_BASE_URL=http://host.docker.internal:3000`, and rebuild. The proxy destination is embedded at build time. Container-side code can also reach other PC services through `host.docker.internal`; other BARA containers are reachable by their service names on `bara-data`.

```sh
docker compose logs -f ui
docker compose down
```

Camera and location require a secure browser context: desktop localhost works; phone access over a LAN address requires HTTPS.

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

The home route is `app/page.tsx`; its redesign is scoped in `app/landing.css`. Shared base styles remain in `app/globals.css` for the existing application. English copy and the labeled synthetic report `BARA-DEMO-0042` live in `lib/content.ts`. Navigation links use the `#intelligence`, `#witness`, and `#how-it-works` sections. Explore Intelligence opens `/intelligence` and Explore Witness opens `/witness`, using the centralized destinations in `lib/destinations.ts`.

Landing components live in `components/landing/`; the reusable parallax composition lives in `components/ui/parallax-scrolling.tsx`, with a usage example in `components/ui/demo.tsx`. The Witness examples are read-only. The landing page self-hosts Inter variable (SIL Open Font License in `public/fonts/`). GSAP ScrollTrigger drives section reveals and the layered BARA wordmark/phone between the opening copy and section 01. Lenis smooths wheel scrolling on the landing route; touch and keyboard scrolling remain native. Reduced-motion and data-saver preferences disable motion. Cleanup removes this component's ticker, scrolling instance, and triggers without affecting other animations. Theme follows the device unless a light/dark preference is saved locally under `bara-landing-theme`.

## Component structure and optional Tailwind/shadcn setup

The hero retains its flickering orange gradient, BARA text wordmark, and phone parallax. Fire motion pauses offscreen and when the tab is hidden; reduced-motion and data-saver preferences retain the static gradient. Worktrees have independent files and build outputs: start each checkout on a different port and use that port when reviewing its changes. The `.worktrees/` directory is excluded from Git.

TypeScript is already configured. Global styles are in `app/globals.css`, and the landing design is in `app/landing.css`. This component uses those existing styles, requires no props or provider, and reuses the local wordmark and Witness device rather than remote image layers. Its layout follows the landing page's desktop/mobile breakpoints. The supplied animation pattern is adapted from [Osmo](https://www.osmo.supply/).

`components/ui/` is the conventional destination for copied shadcn components, keeping reusable UI separate from feature components. This repository does not currently use Tailwind or the shadcn CLI; neither is required by this plain-CSS component. To adopt them later, following the [shadcn installation guide](https://ui.shadcn.com/docs/installation/next):

1. Run `npm install -D tailwindcss @tailwindcss/postcss`.
2. Create `postcss.config.mjs` exporting `export default { plugins: { "@tailwindcss/postcss": {} } };`.
3. Add `@import "tailwindcss";` at the beginning of `app/globals.css` (already imported by the layout). Check existing styles against Tailwind's base reset before shipping.
4. Add `"paths": { "@/*": ["./*"] }` to `compilerOptions` in `tsconfig.json`.
5. Run `npx shadcn@latest init`. Use `app/globals.css` for CSS, `@/components/ui` for UI components, and Lucide for icons. Review generated styles to preserve BARA's colors and type. For Tailwind v4, the Tailwind config path in `components.json` stays empty.

The requested `@studio-freight/lenis` package is installed at 1.0.42. npm marks that package name deprecated in favor of `lenis`; this integration retains the requested import rather than migrating dependencies.

The existing dashboard lives in `components/intelligence/`, with its original route-scoped styles in `app/intelligence/intelligence.css`. Its application code is unchanged by the landing redesign.

The shared adapter and validated frontend types are in `lib/intelligence.ts`. Refresh reloads the selected preview source. The original eight captures and the 72-position map scenario retain their stable IDs and positions. Session groupings and image-assessment examples are authored UI fixtures. Capture-time windows use the dataset reference clock, 18 August 2026 at 16:00 WIB; unknown capture times have an explicit inclusion choice. Search and coordinates stay out of URLs. Phones use Normal; tablets and desktops can open Pro.

Normal shows captures, sessions and concise photo findings. Pro adds session checklists, evidence-source links, missing information, current witness request context, distinct capture/analysis timelines, and two-capture comparison. Session lifecycle, analysis processing and evidence coverage have separate indicators. Claims, operational incident grouping and saved review actions are unavailable. See [UI alignment notes](docs/backend-ui-alignment.md) for mappings and integration gaps.

Inter is subset locally to Latin/Latin Extended, punctuation and currency symbols for this English iteration (151 KB WOFF2, down from 352 KB). Expand the subset before adding other scripts. Late-loaded GSAP skips hero entrances after 1.5 seconds so slow connections do not move text already being read.

The observation map uses OpenStreetMap raster tiles with attribution, zoom and pan controls. Network access is required for the basemap; if tiles fail, selectable observation positions and the report list remain available. Positions in the fixtures are synthetic. A future service adapter must supply only data authorized for the viewer; client-side display checks are not access control.

Weather, basemap, and synthetic dataset provenance: [Data sources](DATA_SOURCES.md).


## Connected Intelligence dashboard

`/intelligence` now defaults to the same backend as the temporary dashboard on port 3002, using the existing `/api/backend` proxy. It loads `GET /sessions`, then each selected session and its snapshots, and streams photos through `GET /snapshots/:id/image`. Normal and Pro share live capture/session filters, map selection, image findings, checklist evidence sources, current Witness requests, and photo comparison (Pro).

The newest 100 sessions load initially; **Load all sessions** includes older records. The visible tab refreshes every 15 seconds with at most four backend requests in flight. Failed or malformed refreshes retain the last successful dataset and display an error; demo data is never substituted. Data settings offers the two separate synthetic examples explicitly. The read endpoints do not expose authentication, record provenance, operational incidents, review persistence, or receipt timestamps; none is invented by this adapter. Capture time is used for filtering and sessions without photos remain visible in the Sessions view. The existing local access model is unchanged.

Photos have loading/error/retry states. AI processing status, session lifecycle, and evidence coverage remain separate. Weather in Pro is a separate, user-triggered Open-Meteo lookup, not backend evidence. Map positions represent cameras, not fire locations.

Rebuild the UI with `docker compose up -d --build --wait ui`. Tests use Node.js 24 (`npm test`); run `npm run lint` and `npm run typecheck` as well. Live integration was checked against all 154 sessions / 1,307 captures available on 7 November 2026, including a successful JPEG stream. Counts change as Witness sessions are submitted.


## Session evidence confidence

Intelligence displays a transparent criteria score on capture/session rows and in the Normal/Pro inspector. Each of the five Witness criteria contributes 20 points only when the backend checklist marks it resolved and it contains a meaningful known value linked to a capture in that session. The denominator stays five when criteria are missing; distance and unknown future criteria are excluded. Repeated captures and repeated assessments do not add points.

Levels: 0 = No confirmed criteria; 20 = Low; 40 or 60 = Moderate; 80 or 100 = High. A missing checklist is Not assessed rather than zero. The breakdown shows each criterion and its contribution. This is accumulated session evidence coverage, not a calibrated probability of fire, danger rating, or assertion about current conditions. The score is derived from saved backend evidence in the UI and updates on the normal refresh; it does not trigger AI requests or change stored assessments.


### Confidence map and viewing direction

Map dots and capture/session confidence badges share a five-color legend: High (teal), Moderate (amber), Low (coral), No confirmed criteria (slate), and Not assessed (violet). Toggle confidence levels in the map legend or filters; the map, lists, sessions and counts share the selection. All levels start enabled, and Clear/Reset filters restores them. Filtering never recalculates scores from a reduced capture set.

Selecting a located capture zooms to its position and draws its recorded direction when **Direction cone** is enabled. The cone is illustrative: 60 degrees wide and 45 metres long, matching the temporary dashboard, not a measured camera field of view, fire distance, or perimeter. Heading reference and accuracy are not supplied. Invalid/missing headings produce no cone; changing selection or filtering out the capture removes the previous cone. Normal and Pro both offer the cone toggle and confidence controls.
