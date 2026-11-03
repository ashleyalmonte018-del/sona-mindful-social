import { buildEdition, categoriesFor, effectiveCurate, effectiveGuard, SPROUT_HARD_BLOCKS, type FeedPrefs } from "./engine";
import { TOPICS, type AgeMode, type CareCondition, type Post, type SonaSettings } from "./types";

export interface Check {
  label: string;
  detail: string;
  ok: boolean;
}

/** The Parent View protection check: verifies the Sprout guardrails actually hold. */
export function protectionChecks(
  pool: Post[],
  p: { ageMode: AgeMode; care: CareCondition[]; settings: SonaSettings },
): Check[] {
  const prefs: FeedPrefs = {
    curate: p.settings.curate,
    guard: p.settings.guard,
    vibe: p.settings.vibe,
    ageMode: p.ageMode,
    care: p.care,
    blockAI: p.settings.blockAI,
  };
  const curate = effectiveCurate(prefs.curate, p.ageMode, p.care);
  const blocked = SPROUT_HARD_BLOCKS.every((t) => curate[t] === "hold");
  const edition = buildEdition(pool, prefs);
  const leaks = edition.posts.filter(
    (j) => j.post.intensity >= 2 || j.post.topics.some((t) => SPROUT_HARD_BLOCKS.includes(t)) || j.post.category === "reels",
  );
  const labels = SPROUT_HARD_BLOCKS.map((t) => TOPICS.find((x) => x.id === t)!.label).join(", ");

  return [
    { label: "Sprout mode is on", detail: "Under-13 guardrails and an 8-post daily edition.", ok: p.ageMode === "sprout" },
    { label: "Guard locked to Strict", detail: "Anything intense is softened or held back.", ok: effectiveGuard(p.ageMode, p.settings.guard) === "strict" },
    { label: "Heavy topics hard-blocked", detail: labels, ok: blocked },
    { label: "Reels removed", detail: "No short-form video in Sprout.", ok: !categoriesFor(p.ageMode).includes("reels") },
    {
      label: "Restricted posts blocked",
      detail: leaks.length
        ? `${leaks.length} restricted post${leaks.length > 1 ? "s" : ""} got through — contact support.`
        : `Checked all ${pool.length} posts in today's pool: ${edition.held.length} held back, none restricted got through.`,
      ok: leaks.length === 0,
    },
  ];
}
