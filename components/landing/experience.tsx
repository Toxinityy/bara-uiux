"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { resolveTheme } from "../../lib/landing-theme";

const key = "bara-landing-theme";
function getTheme() {
  return document.getElementById("bara-landing")?.dataset.theme === "dark"
    ? "dark"
    : "light";
}
function savedTheme() {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function subscribe(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    const root = document.getElementById("bara-landing");
    if (root) root.dataset.theme = resolveTheme(savedTheme(), media.matches);
    callback();
  };
  window.addEventListener("bara-theme-change", callback);
  window.addEventListener("storage", sync);
  media.addEventListener("change", sync);
  sync();
  return () => {
    window.removeEventListener("bara-theme-change", callback);
    window.removeEventListener("storage", sync);
    media.removeEventListener("change", sync);
  };
}

export function ThemeControl() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");
  function toggle() {
    const next = getTheme() === "light" ? "dark" : "light";
    try {
      localStorage.setItem(key, next);
    } catch {
      /* The control still works when storage is unavailable. */
    }
    const root = document.getElementById("bara-landing");
    if (root) root.dataset.theme = next;
    window.dispatchEvent(new Event("bara-theme-change"));
  }
  return (
    <button
      className="bl-theme"
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      <Sun className="bl-sun" size={19} aria-hidden="true" />
      <Moon className="bl-moon" size={19} aria-hidden="true" />
    </button>
  );
}

export function LandingMotion() {
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    if (
      media.matches ||
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData
    )
      return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        const root = document.getElementById("bara-landing");
        if (!root) return;
        gsap.registerPlugin(ScrollTrigger);
        const conditions = gsap.matchMedia();
        conditions.add("(prefers-reduced-motion: no-preference)", () => {
          const focusCleanups: Array<() => void> = [];
          const context = gsap.context(() => {
            // A slow download must not move copy the visitor is already reading.
            if (performance.now() < 1500) gsap
              .timeline({
                defaults: {
                  ease: "power3.out",
                  clearProps: "transform,opacity",
                },
              })
              .fromTo(
                ".bl-hero-title span",
                { y: 18, opacity: 0.65 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.07 },
              )
              .fromTo(
                ".bl-hero-aside",
                { y: 12 },
                { y: 0, duration: 0.5 },
                0.15,
              );
          }, root);
          context.add(() => {
            root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(element => {
              // Do not hide content already visible on a restored or anchor-linked page.
              if (element.getBoundingClientRect().top < window.innerHeight * 0.9) return;
              const reveal = gsap.fromTo(element, { y: 48, opacity: 0 }, {
                y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
                clearProps: "transform,opacity",
                scrollTrigger: { trigger: element, start: "top 90%", once: true },
              });
              // Keyboard navigation should never land on invisible content.
              const show = () => reveal.progress(1);
              element.addEventListener("focusin", show);
              focusCleanups.push(() => element.removeEventListener("focusin", show));
            });
          });
          void document.fonts.ready.then(() => { if (!cancelled) ScrollTrigger.refresh(); });
          return () => {
            focusCleanups.forEach(cleanup => cleanup());
            context.revert();
          };
        });
        dispose = () => conditions.revert();
      })
      .catch(() => {
        /* Content stays visible if the optional animation chunk fails. */
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
  return null;
}
