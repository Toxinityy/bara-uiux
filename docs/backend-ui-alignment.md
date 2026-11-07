# Backend handoff UI alignment

Scope: UI and labeled fixtures only, following `public/UI-BACKEND-HANDOFF.md` and the user's clarification. No proxy, endpoint calls, authentication, persistence, upload or Witness implementation was added. The handoff references `next.config.ts` and `lib/witness-api.ts`; neither exists in this checkout. Deployment behavior has not been verified.

| Surface | Current behavior |
| --- | --- |
| Records | Captures and capture sessions replace operational incidents. Session membership is explicitly authored, independent of legacy incident fixture groups. |
| Normal | Capture ID search, session and capture-time filters; concise availability summary and expandable photo findings. No environmental panel. |
| Analysis | `completed` and `unavailable` come from per-criterion processing status. Partial is a frontend aggregate when some criteria completed and others are unavailable. Missing/empty analyses is Not supplied. Classification remains inside result details. |
| Criteria | Six supplied topics are illustrated, including camera-to-fire distance limitations. Arbitrary result fields and future criterion keys use the same generic details renderer. No confidence score or numeric fire distance is synthesized. |
| Checklist | Separate resolved/uncertain/unavailable item states. `verificationStatus` is presented as evidence coverage, with an explicit reminder that completion does not verify an incident. Known values and retained source results link to their capture. |
| Session | Active/ended describes capture lifecycle only. It is not a review state or incident. No witness identity is inferred. |
| Witness request | Ready, not needed and unavailable states. Gap/revision and analyst reason are visible. Read-only: no skip, text answer, upload or next-request generation. Per-photo follow-up stays separate. |
| Time | Existing frontend `observedAt` represents capture time in this preview. All visible filtering uses that time. `analyzedAt` is a separate authored processing event. Legacy fixture receipt times never appear as API receipt indicators. |
| Location | Existing permitted display positions are reused. Numeric headings retain “Reference unknown”; no map ray, cone or accuracy circle is drawn. Session highlights do not represent fire perimeters. |
| Comparison | Exactly two captures; media availability, timestamps, positions, headings and source-linked AI results remain inspectable. No independence or matching score is inferred. |
| Unsupported | Claim assessments, incident matching, accept/reject/remove membership, saved reviews and audit controls are absent from the active UI. Their previous demo library/data is retained for historical tests, not exposed as backend functionality. |

## Fixture differences from a future API adapter

The current frontend keeps its `Report` projection and stable `DEMO-*` / `ANALYSIS-*` IDs rather than introducing another store. `snapshot` adds evidence metadata; `sessions` adds session state. These readable preview IDs are not MongoDB IDs. Existing fixture captions, area labels, receipt times, review states, claims and incident arrays are legacy test data and are not displayed as API-provided evidence. An eventual adapter must map API `time` to capture time and retrieve snapshots through their session.

The eight-record fixture contains clearly authored image findings and session checklists. No actual photo or model invocation produced them; media is explicitly unavailable. Result shapes illustrate the UI, not a complete formal schema for every criterion. The 72-record map scenario deliberately has no analysis or checklist values; more map points do not manufacture supporting evidence.

Synthetic/provenance markers are absent from current public API responses. Do not label connected data as real, merge it with these fixtures, or infer operational incident membership until provenance is exposed. Images will require `/api/backend/snapshots/:id/image` through a configured proxy. Backend writes and authorization remain separate work.

## Verification

`npm test`: 23 passed, including six new checks for analysis states, capture-time filtering, independent session/checklist/request states, source references, unknown criteria, and unknown heading reference. Lint, typecheck and production build passed. Browser checks covered Normal/Pro selection, source inspection, timelines with undated captures, exactly-two comparison, missing checklists/requests, shared session-filter chips, and 1440px/820px/390px layouts.

No real API, media stream, upload, skip, persisted decision or deployed service was tested. Full physical-device and cross-browser testing remains unrun.
