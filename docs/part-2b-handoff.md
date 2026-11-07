# Part 2B: Pro investigation workspace

Branch: `2b`, already present at the same starting commit as `main` (`71d4d48`). No master branch existed locally. Existing and concurrent landing/Witness edits were preserved, not authored as part of this task.

## Changed files

- `components/intelligence/dashboard.tsx`: shared mode, demo action overlay, visible missing-location filter, responsive inspector dialog and Normal membership/review display.
- `components/intelligence/investigation.tsx`: evidence inspection, report claim table, comparison, candidate decisions, review reasons and timeline.
- `components/intelligence/observation-map.tsx`: functional observation point visibility.
- `lib/investigation.ts`: authored fixture suggestion, immutable membership projection and reassessment state.
- `app/intelligence/pro.css`, `app/intelligence/page.tsx`: scoped layout and styles.
- `tests/investigation.test.mjs`: edit/replay/evidence preservation checks.
- This handoff.

## Integration and limits

Uses the existing validated JSON adapter and eight reports. No backend schemas, dependencies, live endpoints, accounts or privileges were added. Session actions overlay the latest confirmed dataset and survive record refresh and mode switching. Reload resets them; Reset demo requires confirmation. Original report assessments remain unchanged. No incident assessment exists in the source; changed membership is explicitly flagged for reassessment in both modes. Review status is incident-level demo state, separate from original report review labels.

One explicit fixture suggestion links DEMO-004 to DEMO-INC-01 for a comparison exercise. Its rationale discloses different areas and dates. It is not a computed match. Accept/reject/remove and incident review require a reason, with local actions visible in the timeline. There is no server audit log or persistence.

Pro claim vocabulary maps `Reported` to reported and `Unresolved`/`Not reported` to insufficient; the original source explanation remains visible. Neither corroborated nor conflicting is fabricated. No independent source count is available. Agreement/discrepancy and incident assessments are unavailable rather than generated from witness wording.

Media, bearings, heading references, accuracy, capture time, interpretations, corrections and source lineage are absent from the existing adapter. Inspector and comparison expose the missing values. Direction rendering and accuracy circles are unavailable for this dataset; no hypothetical bearings were added. Observation density is unavailable in the existing raster renderer. No terrain provider is configured. The existing OSM map attribution remains intact.

Panel and point preferences persist across mode switching within the mounted workspace. Pro's missing-location filter remains a removable visible control in Normal. At <=1250px, investigation opens in a native modal drawer; at wider widths, it sits beside the shared map and record list. The original Normal dark theme is inherited, not introduced for Pro.

## Demonstrated browser sequence

Chrome DevTools, 1540px and 1100px widths:

1. Open DEMO-008 in Normal, switch to Pro: selection retained.
2. Inspect Smoke: the original synthetic witness statement is shown.
3. Compare DEMO-008 and fixture candidate DEMO-004: exactly two report columns.
4. Enter a reason and accept the candidate locally.
5. Return to Normal, open DEMO-INC-01: four members including DEMO-004, with reassessment warning.
6. Mark incident Reviewed with a reason: unresolved claims remain visible.
7. Apply missing-location filter and return to Normal: visible removable control and two matching reports.
8. Toggle points: six markers disappear and reappear.
9. Open inspector at 1100px: native modal active, no horizontal page overflow.

## Commands and results

- `npm test`: initially 11 passed; latest run 13 passed, including two concurrently added Witness unit tests. This is not an end-to-end Witness verification.
- `npm run lint`: passed after removing the effect dependency warning.
- `npm run typecheck`: passed initially; later run failed in concurrent `app/witness/page.tsx` because `../../components/witness/camera` was missing. No Pro error reported in that run.
- `npm run build`: passed before the concurrent Witness route appeared; generated `/`, `/_not-found`, `/intelligence`. Not a build certification of later concurrent edits.
- `npm run dev -- --port 3000`: found the existing dev server; reused it rather than terminating it.
- Playwright MCP navigation could not run because its browser profile was in use. Chrome DevTools supplied the browser interaction checks and screenshot inspection.

Not exhaustively verified: full keyboard traversal, injected refresh/basemap failures, reset confirmation in the browser, all corrective-action UI permutations, and live write behavior (no live contract exists). Automated tests cover reject/remove semantics, duplicate acceptance, invalid IDs, refresh replay and original evidence preservation. No end-to-end Witness submission tested or added by this change.

## Isolated branch handoff

A concurrent session switched the shared checkout to feat/witness-mobile-camera. The authoritative Pro implementation is now in .worktrees/2b on branch 2b. Only the eight Pro files listed above were copied; the concurrent dashboard branding change was excluded to retain the starting branch's existing wordmark. Shared-checkout copies were left intact to avoid disrupting the other session. No commit or push was made.

In the isolated worktree: 11 tests pass, lint passes, and typecheck passes. The first build attempt could not resolve Next.js because dependencies were outside the worktree; local cached installation was then attempted. Browser checks above were on the shared development server before isolation.

Final isolated validation: npm ci --offline --ignore-scripts succeeded; npm run build passed, including TypeScript. The base commit had an unmatched closing brace at app/landing.css:205; removing that one brace was necessary for the build (additional changed file, no redesign). Final branch checks: 11 tests passed, lint passed, typecheck passed, production build passed. Changes are uncommitted in .worktrees/2b.

## Analytical redesign update

Implemented shared MapLibre renderer, simplified Normal summary, map-centered Pro, on-demand inspector, shift-drag rectangle and current-viewport selection, fit observations, relative observation density (minimum 10 located records, visualization choice), smoothing radius, receipt/observation date filters, timeline-end scrubber and linked records table. Both modes retain the explicitly chosen dataset and visible analysis filters. Added public/data/intelligence-analysis.json with 72 explicitly synthetic authored observations; original eight-report dataset remains the default. No known reposts are present; independence remains unknown.

Dependency: maplibre-gl; package and lockfile updated. New tests validate scenario labels, unique IDs and missing values. npm run typecheck, npm run lint, npm test (12 passed), npm run build passed. Browser at localhost:3002 verified scenario selection, 72 rows, area selection yielding 65 located reports, retained dataset and spatial filter in Normal, canvas rendering and no page overflow. Some map resources failed and the visible warning preserved evidence access. Full rectangle gesture, density visual calibration, keyboard traversal and small-screen regression remain unverified. Timeline scrubber currently spans the fixed August demo dates; date fields remain explicit UTC, displayed event timestamps WIB. No terrain source added. npm audit reports 8 moderate advisories in the ESLint/minimatch development chain; no MapLibre advisory reported. Changes remain uncommitted on the isolated 2b worktree.

## Full-page map workspace
Pro now fills the viewport below the header. Reports, filters/dataset, timeline, table, layers and inspector float over the map. The toolbar toggles panels; Expand map hides windows and Restore windows or Escape restores them. Normal expansion now targets the MapLibre host. MapLibre's worker URL is configured for Next.js/Turbopack, resolving the browser worker-load failure. Verified at 1540px and 1100px: viewport coverage, no page overflow, expand/restore, panel toggles, inspector opening and Escape. Browser console has no errors after worker fix. Lint, typecheck, 12 tests and production build passed. Full keyboard traversal and phone layouts not exhaustively tested. Panels are anchored, not draggable. Changes not committed or pushed.

## Phone mode restriction
Phones use Normal only: viewport widths below 768px, or coarse-pointer landscape screens at most 500px high. The Pro button is omitted and direct Pro URLs normalize to mode=normal. Tablet/desktop layouts retain Pro. Media-query subscriptions handle viewport changes and clean up listeners. Selection, data and filters stay shared. Browser verified 390x844 Normal-only/direct-link behavior and 820x1180 Pro availability. No horizontal overflow at 390px. Lint, typecheck, 12 tests and build passed. Physical phone/landscape device testing not performed; this is a responsive UX rule, not a server access policy.

## Real environmental data
Open-Meteo historical ERA5 and latest model adapters added, with shared Normal/Pro weather state. Normal shows concise values; Pro adds colored display cells, wind arrows, opacity and hourly charts. Source documentation is DATA_SOURCES.md at root. Live historical API and browser values verified for DEMO-008; switching to Normal retained the same values without advanced controls. 17 tests cover units, nulls/zero, UTC, grid limits, cache/deduplication, abort and HTTP failures. Lint/typecheck/build passed. Root checks now exclude nested .worktrees. Not fully verified: area-wide density visual calibration, complete keyboard/phone traversal, and live latest-provider requests. Changes remain uncommitted.


## Normal simplification and Pro controls

Normal no longer renders environmental conditions or starts weather requests. It retains search, area, receipt-time controls, summary, reports and map. Pro date/spatial/missing-location filters remain removable chips in Normal; advanced date controls stay in Pro. Dataset settings are collapsed, with synthetic labels retained.

Observation layers now opens from the Pro toolbar at the left edge, using the same floating-window convention as Filters. Filters has a heading, close action, matching count, reset and removable chips. Select controls use the BARA palette and CSS native picker styling where supported, with native fallback and no new dependencies. Escape dismisses the picker without dismissing its window; panel close restores toolbar focus. Active toolbar hover contrast was corrected.

Validation: `npm test` (17 passed), `npm run typecheck`, `npm run lint`, and `npm run build` passed. Chrome checks covered opened dropdown selection, Escape, area/missing-location filtering, reset, active time chips in Normal, no Normal weather request on report selection, retained DEMO-008 selection in Pro claim evidence, and Pro environment availability. Inspected desktop, 820px tablet and 390px phone layouts; no horizontal page overflow. No physical-device, Firefox/Safari native-picker, or exhaustive keyboard traversal testing. Earlier environmental note describing a Normal weather card is superseded. Changes are in the main checkout on branch 2b, uncommitted and unpushed.
