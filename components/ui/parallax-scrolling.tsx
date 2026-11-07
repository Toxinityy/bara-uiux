"use client";

import { useEffect, useRef } from "react";
import { WitnessDevice } from "../landing/witness-device";

export function ParallaxComponent() {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    void Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("@studio-freight/lenis"),
    ]).then(([{ gsap }, { ScrollTrigger }, { default: Lenis }]) => {
      const root = parallaxRef.current;
      if (cancelled || !root) return;
      gsap.registerPlugin(ScrollTrigger);
      const conditions = gsap.matchMedia();

      conditions.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        // Keep the supplied depth effect, using BARA artwork instead of stock images.
        for (const [layer, yPercent] of [["3", 40], ["4", 10]] as const) {
          timeline.to(root.querySelectorAll(`[data-parallax-layer="${layer}"]`), {
            yPercent,
            ease: "none",
          }, 0);
        }

        const lenis = new Lenis();
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);

        return () => {
          gsap.ticker.remove(tick);
          lenis.off("scroll", ScrollTrigger.update);
          lenis.destroy();
        };
      }, root);

      void document.fonts.ready.then(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
      dispose = () => conditions.revert();
    }).catch(() => {
      // The composition stays visible with native scrolling if motion cannot load.
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <div className="bl-product-stage bl-parallax" ref={parallaxRef} data-parallax-layers>
      <span className="bl-giant-wordmark" data-parallax-layer="3" aria-hidden="true">
        BARA
      </span>
      <div data-parallax-layer="4">
        <WitnessDevice />
      </div>
      <div className="bl-parallax-fade" aria-hidden="true" />
    </div>
  );
}
