import { describe, expect, it } from "vitest";

import { CIRCLE_TIERS, filterByTier, tierCounts, tiersByMember } from "./tiers";

describe("circle tiers", () => {
  it("offers exactly the six agreed tiers", () => {
    expect(CIRCLE_TIERS.map((t) => t.label).sort()).toEqual(
      ["Acquaintances", "Family Only", "Location-Based", "Niche Interest", "True Inner Circle", "Work"].sort(),
    );
  });

  it("lets one member sit in more than one tier, dropping unknown tiers", () => {
    const by = tiersByMember([
      { member_id: "a", tier: "work" },
      { member_id: "a", tier: "local" },
      { member_id: "a", tier: "bogus" },
      { member_id: "b", tier: "inner" },
    ]);
    expect(by["a"]).toEqual(["work", "local"]);
    expect(by["b"]).toEqual(["inner"]);
    expect(tierCounts(by).work).toBe(1);
    expect(tierCounts(by).family).toBe(0);
  });

  it("filters members by tier, and 'all' shows everyone", () => {
    const members = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const by = tiersByMember([{ member_id: "b", tier: "family" }]);
    expect(filterByTier(members, by, "family").map((m) => m.id)).toEqual(["b"]);
    expect(filterByTier(members, by, "all")).toHaveLength(3);
  });
});
