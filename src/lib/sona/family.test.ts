import { describe, expect, it } from "vitest";

import { protectionChecks } from "./family";
import { POSTS } from "./posts";
import { DEFAULT_SETTINGS } from "./types";

describe("parent protection check", () => {
  it("passes every check for a Sprout account even if the child loosened every topic", () => {
    const loose = { ...DEFAULT_SETTINGS, guard: "gentle" as const, curate: Object.fromEntries(Object.keys(DEFAULT_SETTINGS.curate).map((k) => [k, "show"])) as typeof DEFAULT_SETTINGS.curate };
    const checks = protectionChecks(POSTS, { ageMode: "sprout", care: [], settings: loose });
    expect(checks.every((c) => c.ok)).toBe(true);
  });
  it("fails the Sprout check for a Bloom account", () => {
    const checks = protectionChecks(POSTS, { ageMode: "bloom", care: [], settings: DEFAULT_SETTINGS });
    expect(checks.find((c) => c.label === "Sprout mode is on")?.ok).toBe(false);
  });
});
