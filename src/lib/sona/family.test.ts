import { describe, expect, it } from "vitest";

import { protectionChecks } from "./family";
import { POSTS } from "./posts";
import { DEFAULT_SETTINGS } from "./types";

describe("parent protection check", () => {
  it("passes every check for a Sapling account even if the child loosened every topic", () => {
    const loose = { ...DEFAULT_SETTINGS, guard: "gentle" as const, curate: Object.fromEntries(Object.keys(DEFAULT_SETTINGS.curate).map((k) => [k, "show"])) as typeof DEFAULT_SETTINGS.curate };
    const checks = protectionChecks(POSTS, { ageMode: "sapling", care: [], settings: loose });
    expect(checks.every((c) => c.ok)).toBe(true);
  });
  it("fails the Sapling check for a Sprout (teen) account", () => {
    const checks = protectionChecks(POSTS, { ageMode: "sprout", care: [], settings: DEFAULT_SETTINGS });
    expect(checks.find((c) => c.label === "Sapling mode is on")?.ok).toBe(false);
  });
});
