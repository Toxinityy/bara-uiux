# Witness mobile UI preview

Route: `/witness`. Branch: `witness-mobile`.

Uses the supplied BARA v2 brand guidelines, local `public/fonts/InterVariable.woff2`, existing logo artwork, and Lucide icons. The landing page Witness action links here.

The interface supports phone portrait widths and coarse-pointer phone landscape up to 1024 × 600. Wider desktop views receive a mobile-only notice with a copy-link action. This is a presentation restriction, not a security boundary; browser device emulation can open the mobile interface.

Camera, location, and compass access are real, requested only after an explicit action. Camera uses a rear-facing preference, no microphone, and `object-fit: contain`. Permissions require HTTPS (or localhost). Close releases the camera, while separate controls stop location and compass; leaving the page releases all three. Compass accepts only absolute headings, not relative orientation.

This is the UI-preview scope selected by the user. No backend contract is assumed. Start session explains that sessions are unavailable; Snap stays disabled with setup guidance and then an explicit submission-unavailable explanation. No photos are captured, persisted, or uploaded. Checklist topics stay unassessed, with per-topic limitations and evidence details. Model instructions and inability feedback remain unavailable. The coverage legend demonstrates all four visual states without inventing findings.

Backend integration still needs session creation/check/end, snapshot submission, seven-topic evidence aggregation/history, instruction delivery/order/lifecycle, photo-to-instruction association, and feedback acknowledgement. End-session summary and successful submission states need these services. They are not simulated by this preview.

Run `npm run dev` for local development and `npm run build` for deployment validation. Deploy this branch using the existing Next.js hosting workflow; no hosting provider is configured by this change. Real permission prompts, compass calibration, and safe-area/fullscreen behavior require final verification on physical iOS and Android devices over HTTPS.

Validation: 13 unit tests, TypeScript, production build, and application-source lint passed. Browser checks exercised portrait, landscape, desktop gating, enlarged text, native dialog focus return, permission denial, pending-request cancellation, stream cleanup, offline messages, and mocked device readings. Full `npm run lint` encounters unrelated code inside the separate `.worktrees/2b` directory; `eslint app components lib tests` is clean.
