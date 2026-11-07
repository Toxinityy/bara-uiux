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
