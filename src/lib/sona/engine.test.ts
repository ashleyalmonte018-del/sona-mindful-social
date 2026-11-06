import { describe, expect, it } from "vitest";

import {
  applyDiversificationCap,
  buildEdition,
  dailyLimit,
  effectiveCurate,
  effectiveDials,
  guardVerdict,
  judgePost,
  type FeedPrefs,
} from "./engine";
import { POSTS } from "./posts";
import { DEFAULT_SETTINGS, type Post } from "./types";

const base: FeedPrefs = {
  curate: { ...DEFAULT_SETTINGS.curate },
  guard: "balanced",
  vibe: { ...DEFAULT_SETTINGS.vibe },
  ageMode: "sprout",
  care: [],
};

const post = (over: Partial<Post>): Post => ({
  id: "x", author: "a", handle: "a", category: "inspiration", topics: [], subgenre: "s",
  intensity: 0, triggers: [], vibes: {}, worthIt: 0.5, volatility: 0, text: "", hoursAgo: 0, ...over,
});

describe("finite edition size", () => {
  it("is 8 for Sapling, 12 for Sprout, 15 for Bloom", () => {
    expect(dailyLimit("sapling")).toBe(8);
    expect(dailyLimit("sprout")).toBe(12);
    expect(dailyLimit("bloom")).toBe(15);
  });

  it("never returns more visible posts than the limit", () => {
    const e = buildEdition(Array.from({ length: 20 }, (_, i) => post({ id: String(i), subgenre: `genre-${i}` })), base);
    expect(e.posts.length).toBe(12);
    expect(e.posts.every((p) => p.verdict !== "hold")).toBe(true);
  });
});

describe("guard levels", () => {
  it("gentle softens only intensity 3", () => {
    expect(guardVerdict(2, "gentle")).toBe("show");
    expect(guardVerdict(3, "gentle")).toBe("soften");
  });
  it("balanced softens 2 and holds 3", () => {
    expect(guardVerdict(2, "balanced")).toBe("soften");
    expect(guardVerdict(3, "balanced")).toBe("hold");
  });
  it("strict softens 1 and holds 2+", () => {
    expect(guardVerdict(1, "strict")).toBe("soften");
    expect(guardVerdict(2, "strict")).toBe("hold");
  });
});

describe("care profile topic floors", () => {
  it("eating disorder locks Body & looks to hold even if the user picks let in", () => {
    const c = effectiveCurate({ ...base.curate, body: "show", food: "show" }, "sprout", ["eating"]);
    expect(c.body).toBe("hold");
    expect(c.food).toBe("soften");
  });

  it("anxiety locks News to hold and caps the World dial at 20", () => {
    const c = effectiveCurate({ ...base.curate, news: "show" }, "sprout", ["anxiety"]);
    expect(c.news).toBe("hold");
    expect(effectiveDials({ ...base.vibe, world: 100 }, ["anxiety"]).world).toBe(20);
  });

  it("holds a post carrying a condition trigger regardless of guard", () => {
    const j = judgePost(post({ triggers: ["calorie-talk"] }), { ...base, guard: "gentle", care: ["eating"] });
    expect(j.verdict).toBe("hold");
    expect(j.careFlag).toBe(true);
  });
});

describe("sapling mode", () => {
  it("hard-blocks drama even when the user sets it to let in", () => {
    const c = effectiveCurate({ ...base.curate, drama: "show" }, "sapling", []);
    expect(c.drama).toBe("hold");
  });
  it("removes reels from the edition", () => {
    const e = buildEdition(POSTS, { ...base, ageMode: "sapling" });
    expect(e.posts.some((p) => p.post.category === "reels")).toBe(false);
  });
});

describe("diversification cap", () => {
  it("pushes a third same-tag item back 5 spaces", () => {
    const items = ["a", "a", "a", "b", "c", "d", "e", "f", "g"];
    const out = applyDiversificationCap(items, (x) => x);
    expect(out).toEqual(["a", "a", "b", "c", "d", "e", "f", "a", "g"]);
  });
  it("never leaves 3 identical subgenres in a row in the edition", () => {
    const e = buildEdition(POSTS, { ...base, vibe: { ...base.vibe, laughs: 100 } });
    const subs = e.posts.map((p) => p.post.subgenre);
    for (let i = 2; i < subs.length; i++) {
      expect(subs[i] === subs[i - 1] && subs[i] === subs[i - 2]).toBe(false);
    }
  });
});

describe("cool-down filter", () => {
  it("ranks a fast-trending post below an identical calm one", () => {
    const calm = judgePost(post({ volatility: 0.1 }), base);
    const hot = judgePost(post({ volatility: 0.95 }), base);
    expect(hot.coolDown).toBe(true);
    expect(hot.score).toBeLessThan(calm.score);
  });
});

describe("label only", () => {
  it("a topic set to label only gives a label verdict (summary first), not hidden", () => {
    const j = judgePost(post({ topics: ["romance"] }), { ...base, curate: { ...base.curate, romance: "label" } });
    expect(j.verdict).toBe("label");
  });
  it("care floors still override label only", () => {
    const c = effectiveCurate({ ...base.curate, body: "label" }, "sprout", ["eating"]);
    expect(c.body).toBe("hold");
  });
});

describe("AI content", () => {
  it("bans AI-generated posts when the ban is on", () => {
    expect(judgePost(post({ ai: "generated" }), { ...base, blockAI: true }).verdict).toBe("hold");
    expect(judgePost(post({ ai: "generated" }), base).verdict).toBe("show");
  });
  it("does not ban edited photos, only AI-generated ones", () => {
    expect(judgePost(post({ ai: "edited" }), { ...base, blockAI: true }).verdict).toBe("show");
  });
});

describe("custom topics and hashtags", () => {
  it("boosts a post matching a #hashtag the user typed", () => {
    const p = post({ text: "Easy banana bread for beginners" });
    const plain = judgePost(p, base);
    const boosted = judgePost(p, { ...base, boosts: ["#Banana Bread"] });
    expect(boosted.score).toBeGreaterThan(plain.score);
  });
});
