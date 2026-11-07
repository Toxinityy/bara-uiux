import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { sample } from "../lib/content.ts";
import { resolveTheme } from "../lib/landing-theme.ts";
import { destinations } from "../lib/destinations.ts";

test("sample preserves provenance and unknowns without invented coordinates", () => {
  assert.equal(sample.demo, true);
  assert.equal(sample.id, "BARA-DEMO-0042");
  assert.equal(
    sample.claims.find((c) => c.claim === "Smoke").state,
    "Reported",
  );
  assert.equal(
    sample.claims.find((c) => c.claim === "Fire presence").state,
    "Insufficient evidence",
  );
  assert.equal(sample.coordinates, "Not provided");
});

test("saved theme wins, otherwise device preference is used", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme("invalid", false), "light");
});

test("product links name previews or point to an available local route", () => {
  for (const [product, destination] of Object.entries(destinations)) {
    if (destination.href.startsWith("#")) {
      assert.equal(destination.href, `#${product}`);
      assert.match(destination.label, /^Preview /);
    } else {
      const pathname = new URL(destination.href, "http://bara.test").pathname;
      assert.ok(
        existsSync(new URL(`../app${pathname}/page.tsx`, import.meta.url)),
      );
      assert.match(destination.label, /^Open /);
    }
  }
});
