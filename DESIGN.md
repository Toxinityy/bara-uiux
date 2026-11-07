# BARA landing design v2

The replacement brief specifies an ember-gradient opening, a 104px wide-screen Inter headline, a narrow right-hand paragraph, a central Witness device and monumental decorative BARA lettering. A clean cut into near-black editorial content separates spectacle from evidence review. Intelligence, Witness, workflow and closing sections follow in that order.

All landing styles and theme tokens are scoped under `.bl` in `app/landing.css`; the established dashboard styles remain untouched. Locally served Inter variable supplies UI and display typography with automatic optical sizing. Header, footer and product-preview branding use the supplied curved flame and rounded Bara artwork. A shared logo component crops out the presentation-board captions and removes backgrounds with native SVG alpha filters. Dark surfaces use the orange/white variant; light surfaces use the supplied black variant. Original PNG assets are unchanged. Oversized hero lettering remains a separate decorative treatment.

Use the supplied v2 primitives: Coal #180805, Maroon #430A07, Fire Red #A91F08, Wildfire #E84A08, Signal #FA6A0B, Dry Grass #F1C986 and Mist #F8F3EC. Operational preview surfaces stay flat. Light actions pair #B7350B with white; dark actions pair #FA6A0B with #1B0C06. Unknown states use the specified blue-gray tokens and explicit text labels.

Light/dark follows saved preference, then device preference. The hero, editorial section and closing stay art-directed; supporting sections and previews change theme. Theme never changes evidence or selected preview mode. Normal and Pro share BARA-DEMO-0042. Coordinates are absent and no location is plotted. Witness examples are visibly read-only.

GSAP and ScrollTrigger drive the landing motion. Hero text enters once; `components/ui/parallax-scrolling.tsx` moves the BARA wordmark and Witness device at different depths as their stage leaves the viewport, fading into section 01. Lenis smooths wheel scrolling; keyboard and touch scrolling remain native. Section headings, the Intelligence screenshot, Witness preview and workflow items slide up once. Only transforms and opacity animate; reduced-motion and data-saver users receive static content. Route cleanup reverts scoped animations and removes the Lenis ticker and listeners.

Section 02 displays `public/images/intelligence-dashboard.png`, a browser capture of the local Normal dashboard with synthetic data and OpenStreetMap attribution retained. It is a static screenshot, with a separate link to the working application. The React theme controller initializes the saved/device theme; no executable script tag is rendered inside the page component.

The reference image and source DOCX were not attached; this implementation follows the explicit reference description, palette, copy, and type scale in the user’s replacement brief.

## Intelligence exploration surface

The `/intelligence` workspace takes its colors and typography from the landing page and the inspected `public/guidelines/BARA_Brand_Identity_and_Typography_Guidelines_v2.docx`. It uses the same locally hosted Inter variable file through `next/font/local`, automatic optical sizing, and 600-weight headings with display optical sizing. Dark colors match `app/landing.css`: canvas #130C0A, surface #211715, raised #2A1D1A, Mist text #F8F3EC, secondary text #C9B8AE, Wildfire brand #E84A08, and Signal actions #FA6A0B with dark text #1B0C06. Unresolved review states use blue-gray #C4CDD7 on #242B33. Green-tinted surfaces have been removed. The basemap is desaturated so orange observation markers remain distinct.

Summary counts sit beside the evidence summary; the map and list share one continuous workspace. The map supports pointer dragging, keyboard navigation, and expansion. Hover and focus connect reports to markers; selection opens an evidence panel with Escape dismissal. Reduced motion removes panel transitions. Data remains synthetic, observation positions remain distinct from fire locations, and Pro stays unavailable. Route-specific styling is in `app/intelligence/exploration.css`.
