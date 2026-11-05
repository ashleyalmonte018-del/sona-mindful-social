// Circle tiers: the owner privately sorts circle members (mutual follows) into categories.
// Members never see which tiers they're in. Per-post tier visibility comes in a later batch.

export const CIRCLE_TIERS = [
  { id: "inner", label: "True Inner Circle", blurb: "Your closest people" },
  { id: "family", label: "Family Only", blurb: "Relatives and family friends" },
  { id: "work", label: "Work", blurb: "Coworkers and classmates" },
  { id: "acquaintances", label: "Acquaintances", blurb: "People you know a little" },
  { id: "niche", label: "Niche Interest", blurb: "Your hobby and fandom people" },
  { id: "local", label: "Location-Based", blurb: "Neighbours and people nearby" },
] as const;

export type TierId = (typeof CIRCLE_TIERS)[number]["id"];
export const isTierId = (s: string): s is TierId => CIRCLE_TIERS.some((t) => t.id === s);
export const tierLabel = (id: string) => CIRCLE_TIERS.find((t) => t.id === id)?.label ?? id;

export interface TierRow {
  member_id: string;
  tier: string;
}

/** member id -> the tiers they're in (unknown tier ids are dropped). */
export function tiersByMember(rows: TierRow[]): Record<string, TierId[]> {
  const out: Record<string, TierId[]> = {};
  for (const r of rows) {
    if (!isTierId(r.tier)) continue;
    const list = (out[r.member_id] ??= []);
    if (!list.includes(r.tier)) list.push(r.tier);
  }
  for (const id of Object.keys(out)) out[id]!.sort((a, b) => tierOrder(a) - tierOrder(b));
  return out;
}

const tierOrder = (id: TierId) => CIRCLE_TIERS.findIndex((t) => t.id === id);

/** How many members are in each tier. */
export function tierCounts(byMember: Record<string, TierId[]>): Record<TierId, number> {
  const out = Object.fromEntries(CIRCLE_TIERS.map((t) => [t.id, 0])) as Record<TierId, number>;
  for (const tiers of Object.values(byMember)) for (const t of tiers) out[t] += 1;
  return out;
}

/** Members visible under a tier filter; "all" shows everyone. */
export function filterByTier<T extends { id: string }>(members: T[], byMember: Record<string, TierId[]>, tier: TierId | "all"): T[] {
  if (tier === "all") return members;
  return members.filter((m) => byMember[m.id]?.includes(tier));
}
