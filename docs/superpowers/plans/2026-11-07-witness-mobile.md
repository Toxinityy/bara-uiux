# Witness mobile preview implementation plan

**Goal:** Implement the approved mobile UI preview from `public/handoff-features/camera-ux-ui-handoff.md` on `feat/witness-mobile-camera`.
**Architecture:** An isolated `/witness` route uses the existing local Inter font and BARA logo. Browser device permissions are real and user initiated; server-dependent features explicitly remain unavailable.
**Tech stack:** Existing Next.js, React, TypeScript, Lucide and native browser APIs; no added packages.

- [x] Add focused tests for absolute compass readings and capture-blocking explanations.
- [x] Build the camera surface, seven-topic rail, accessible details/controls, desktop notice, device cleanup, and unavailable service states.
- [x] Connect the existing Witness destination and document preview limitations.
- [x] Run tests, typecheck, lint, production build, and browser checks in portrait, landscape, desktop, and enlarged text. Review the result independently.

Scope: new route/style, Witness component/device hook, small device helper, tests, and `lib/destinations.ts`. Preserve existing uncommitted work. No API contracts, synthetic assessments, upload queue, extra packages, or deployment infrastructure.

Review focus: permission denial; closing while permission is pending; route/unmount cleanup; no absolute heading; short viewports and keyboard focus. Desktop restriction is an interface rule, not authentication; phones in landscape remain supported. This preview does not implement the separately hosted backend described in section 12 of the handoff.

Validation: 13 tests passed, TypeScript and production build passed, application-source ESLint passed (`eslint app components lib tests`). Whole-repository lint also traverses a separately created `.worktrees/2b` and reports unrelated errors there; it is not claimed clean. Browser checks covered 390×844, 320×568, 844×390, 1440×900, 200% text, topic sheets, controls, session-unavailable messaging, Escape/focus return, permission denial, pending camera cancellation, stream cleanup, mocked location and absolute compass, offline state, and pagehide cleanup. Physical devices were not tested. Impeccable detector returned no findings; the independent reviewer returned **ship as a UI preview**. Existing design-system files were preserved.
