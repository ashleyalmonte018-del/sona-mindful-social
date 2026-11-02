// Sona's filtering + ranking engine. Pure functions so the rules are testable.
import { CARE_RULES } from "./care";
import {
  DIALS,
  FILTER_RANK,
  TOPICS,
  type AgeMode,
  type CareCondition,
  type DialId,
  type Dials,
  type Filter,
  type GuardLevel,
  type Post,
  type PostCategory,
  type TopicId,
} from "./types";

export interface FeedPrefs {
  curate: Record<TopicId, Filter>;
  guard: GuardLevel;
  vibe: Dials;
  ageMode: AgeMode;
  care: CareCondition[];
  /** Net "worth it" ratings per subgenre (+1 worth it, -1 meh). */
  ratings?: Record<string, number>;
}

export type ReasonKind = "topic" | "guard" | "care" | "age" | "cooldown" | "vibe" | "rating" | "sunk" | "diversity" | "quality";
export interface Reason {
  kind: ReasonKind;
  text: string;
}

export interface Judged {
  post: Post;
  verdict: Filter;
  reasons: Reason[];
  score: number;
  coolDown: boolean;
  careFlag: boolean;
  /** Triggers / topics that caused a soften or hold, for the card label. */
  flags: string[];
}

const topicLabel = (id: TopicId) => TOPICS.find((t) => t.id === id)?.label ?? id;
const dialLabel = (id: DialId) => DIALS.find((d) => d.id === id)?.label ?? id;
const careLabel = (id: CareCondition) => CARE_RULES.find((r) => r.id === id)?.label ?? id;
const maxFilter = (a: Filter, b: Filter): Filter => (FILTER_RANK[a] >= FILTER_RANK[b] ? a : b);

// ---------- Age modes ----------

export const SPROUT_HARD_BLOCKS: TopicId[] = ["body", "news", "drama", "romance", "hustle"];

export function dailyLimit(ageMode: AgeMode): number {
  return ageMode === "sprout" ? 8 : ageMode === "open" ? 15 : 12;
}

export function effectiveGuard(ageMode: AgeMode, guard: GuardLevel): GuardLevel {
  return ageMode === "sprout" ? "strict" : guard;
}

export function categoriesFor(ageMode: AgeMode): PostCategory[] {
  return ageMode === "sprout"
    ? ["inspiration", "learning", "friends"]
    : ["inspiration", "learning", "friends", "reels"];
}

// ---------- Floors (care + age) ----------

export interface Floor {
  floor: Filter;
  sources: string[];
}

export function topicFloors(ageMode: AgeMode, care: CareCondition[]): Record<TopicId, Floor> {
  const out = Object.fromEntries(TOPICS.map((t) => [t.id, { floor: "show" as Filter, sources: [] as string[] }])) as Record<
    TopicId,
    Floor
  >;
  for (const c of care) {
    const rule = CARE_RULES.find((r) => r.id === c);
    if (!rule) continue;
    for (const [topic, f] of Object.entries(rule.topicFloors) as [TopicId, Filter][]) {
      out[topic].floor = maxFilter(out[topic].floor, f);
      out[topic].sources.push(rule.label);
    }
  }
  if (ageMode === "sprout") {
    for (const t of SPROUT_HARD_BLOCKS) {
      out[t].floor = "hold";
      out[t].sources.push("Sprout mode");
    }
    out.mental.floor = maxFilter(out.mental.floor, "soften");
    out.mental.sources.push("Sprout mode");
  }
  return out;
}

/** The user's curate choices, clamped so nothing can be loosened below its floor. */
export function effectiveCurate(
  curate: Record<TopicId, Filter>,
  ageMode: AgeMode,
  care: CareCondition[],
): Record<TopicId, Filter> {
  const floors = topicFloors(ageMode, care);
  return Object.fromEntries(
    TOPICS.map((t) => [t.id, maxFilter(curate[t.id] ?? "show", floors[t.id].floor)]),
  ) as Record<TopicId, Filter>;
}

export function dialCaps(care: CareCondition[]): Partial<Record<DialId, { cap: number; source: string }>> {
  const out: Partial<Record<DialId, { cap: number; source: string }>> = {};
  for (const c of care) {
    const rule = CARE_RULES.find((r) => r.id === c);
    if (!rule) continue;
    for (const [dial, cap] of Object.entries(rule.dialCaps) as [DialId, number][]) {
      const prev = out[dial];
      if (!prev || cap < prev.cap) out[dial] = { cap, source: rule.label };
    }
  }
  return out;
}

/** Vibe dials with care caps applied — user dials can never exceed a cap. */
export function effectiveDials(vibe: Dials, care: CareCondition[]): Dials {
  const caps = dialCaps(care);
  const out = { ...vibe };
  for (const d of DIALS) {
    const cap = caps[d.id]?.cap;
    if (cap !== undefined) out[d.id] = Math.min(out[d.id], cap);
  }
  return out;
}

export function heldTriggers(care: CareCondition[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of care) {
    const rule = CARE_RULES.find((r) => r.id === c);
    rule?.heldTriggers.forEach((t) => m.set(t, rule.label));
  }
  return m;
}

// ---------- Judging one post ----------

export function guardVerdict(intensity: number, guard: GuardLevel): Filter {
  if (guard === "gentle") return intensity >= 3 ? "soften" : "show";
  if (guard === "balanced") return intensity >= 3 ? "hold" : intensity >= 2 ? "soften" : "show";
  return intensity >= 2 ? "hold" : intensity >= 1 ? "soften" : "show";
}

export const COOL_DOWN_THRESHOLD = 0.7;

export function judgePost(post: Post, prefs: FeedPrefs): Judged {
  const reasons: Reason[] = [];
  const flags: string[] = [];
  let verdict: Filter = "show";
  let careFlag = false;

  const curate = effectiveCurate(prefs.curate, prefs.ageMode, prefs.care);
  const floors = topicFloors(prefs.ageMode, prefs.care);

  // 1. Topics
  for (const t of post.topics) {
    const f = curate[t];
    if (f !== "show") {
      const fromFloor = FILTER_RANK[floors[t].floor] >= FILTER_RANK[f] && floors[t].floor !== "show";
      reasons.push({
        kind: fromFloor ? (floors[t].sources.includes("Sprout mode") ? "age" : "care") : "topic",
        text: `${topicLabel(t)} is set to ${f === "hold" ? "hold back" : "soften"}${fromFloor ? ` (locked by ${floors[t].sources.join(", ")})` : ""}.`,
      });
      if (fromFloor && !floors[t].sources.every((s) => s === "Sprout mode")) careFlag = true;
      flags.push(topicLabel(t));
      verdict = maxFilter(verdict, f);
    }
  }

  // 2. Care triggers
  const held = heldTriggers(prefs.care);
  for (const trig of post.triggers) {
    const src = held.get(trig);
    if (src) {
      verdict = "hold";
      careFlag = true;
      flags.push(trig.replace(/-/g, " "));
      reasons.push({ kind: "care", text: `Contains "${trig.replace(/-/g, " ")}", a known trigger for ${src}. Always held back.` });
    }
  }

  // 3. Guard level (Sprout forces strict)
  const guard = effectiveGuard(prefs.ageMode, prefs.guard);
  const g = guardVerdict(post.intensity, guard);
  if (g !== "show") {
    reasons.push({
      kind: prefs.ageMode === "sprout" ? "age" : "guard",
      text: `Intensity ${post.intensity}/3 meets your ${guard} guard → ${g === "hold" ? "held back" : "softened"}.`,
    });
    if (!flags.length) flags.push("intense");
    verdict = maxFilter(verdict, g);
  }

  // 4. Score: time well spent, not watch time
  const dials = effectiveDials(prefs.vibe, prefs.care);
  let score = post.worthIt * 60;
  reasons.push({ kind: "quality", text: `${Math.round(post.worthIt * 100)}% of people said this was worth their time afterwards.` });

  const vibeHits: string[] = [];
  for (const [d, w] of Object.entries(post.vibes) as [DialId, number][]) {
    score += (dials[d] / 100) * w * 25;
    if (dials[d] >= 50 && w >= 0.5) vibeHits.push(dialLabel(d));
  }
  if (vibeHits.length) reasons.push({ kind: "vibe", text: `Matches your ${vibeHits.join(" + ")} dial${vibeHits.length > 1 ? "s" : ""}.` });

  const coolDown = post.volatility >= COOL_DOWN_THRESHOLD;
  if (coolDown) {
    score -= (post.volatility - 0.5) * 80;
    reasons.push({ kind: "cooldown", text: "Trending fast with heated comments — cooled down so it can't snowball." });
  }

  for (const c of prefs.care) {
    const rule = CARE_RULES.find((r) => r.id === c);
    if (rule?.sunkPillars.includes(post.subgenre)) {
      score -= 35;
      careFlag = true;
      reasons.push({ kind: "sunk", text: `"${post.subgenre.replace(/-/g, " ")}" sinks in ranking for your ${careLabel(c)} care profile.` });
    }
  }

  const r = prefs.ratings?.[post.subgenre] ?? 0;
  if (r !== 0) {
    const clamped = Math.max(-3, Math.min(3, r));
    score += clamped * 8;
    reasons.push({ kind: "rating", text: `You rated similar posts ${clamped > 0 ? "worth it" : "meh"} before.` });
  }

  score -= post.hoursAgo * 0.4;

  return { post, verdict, reasons, score, coolDown, careFlag, flags: Array.from(new Set(flags)) };
}

// ---------- Diversification cap ----------

/**
 * No more than `maxRun` consecutive items may share a key. A violating item is
 * pushed back `pushBack` spaces (or to the end if the list is shorter).
 */
export function applyDiversificationCap<T>(
  items: T[],
  key: (t: T) => string,
  maxRun = 2,
  pushBack = 5,
  onMove?: (t: T) => void,
): T[] {
  const out = [...items];
  let guard = 0;
  for (let i = maxRun; i < out.length && guard < out.length * 10; i++) {
    const k = key(out[i]);
    let run = true;
    for (let j = 1; j <= maxRun; j++) if (key(out[i - j]) !== k) run = false;
    if (!run) continue;
    const [moved] = out.splice(i, 1);
    const target = Math.min(i + pushBack, out.length);
    if (target === i) {
      out.splice(i, 0, moved); // nothing after it to swap with
      continue;
    }
    out.splice(target, 0, moved);
    onMove?.(moved);
    guard++;
    i--;
  }
  return out;
}

// ---------- Edition ----------

export interface Edition {
  /** Visible posts (show or soften), ranked, capped at the daily limit. */
  posts: Judged[];
  /** Held-back posts with the index (in `posts`) they would have appeared after. */
  held: { judged: Judged; after: number }[];
  limit: number;
  softened: number;
}

export function buildEdition(pool: Post[], prefs: FeedPrefs): Edition {
  const allowed = categoriesFor(prefs.ageMode);
  const judged = pool
    .filter((p) => allowed.includes(p.category))
    .map((p) => judgePost(p, prefs))
    .sort((a, b) => b.score - a.score);

  const visibleRanked = judged.filter((j) => j.verdict !== "hold");
  const capped = applyDiversificationCap(visibleRanked, (j) => j.post.subgenre, 2, 5, (j) =>
    j.reasons.push({ kind: "diversity", text: "Pushed back 5 spots so you don't see 3 of the same kind in a row." }),
  );
  const limit = dailyLimit(prefs.ageMode);
  const posts = capped.slice(0, limit);

  const held: Edition["held"] = [];
  judged.forEach((j, rankIdx) => {
    if (j.verdict !== "hold") return;
    const above = judged.slice(0, rankIdx).filter((x) => x.verdict !== "hold").length;
    if (above <= posts.length) held.push({ judged: j, after: above - 1 });
  });

  return { posts, held, limit, softened: posts.filter((p) => p.verdict === "soften").length };
}

/** Live counts for a guard level, used by the Curate screen. */
export function guardCounts(pool: Post[], prefs: FeedPrefs, guard: GuardLevel) {
  const j = pool.map((p) => judgePost(p, { ...prefs, guard }));
  return {
    shown: j.filter((x) => x.verdict === "show").length,
    softened: j.filter((x) => x.verdict === "soften").length,
    held: j.filter((x) => x.verdict === "hold").length,
  };
}

/** Normalized dial mix for the live mix bar. */
export function dialMix(vibe: Dials): { id: DialId; pct: number }[] {
  const total = DIALS.reduce((s, d) => s + vibe[d.id], 0) || 1;
  return DIALS.map((d) => ({ id: d.id, pct: (vibe[d.id] / total) * 100 }));
}
