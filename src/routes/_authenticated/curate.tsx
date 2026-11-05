import { createFileRoute } from "@tanstack/react-router";
import { HeartHandshake, Lock } from "lucide-react";
import { useMemo } from "react";

import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { effectiveGuard, guardCounts, topicFloors, type FeedPrefs } from "@/lib/sona/engine";
import { POSTS } from "@/lib/sona/posts";
import { FILTER_RANK, FILTERS, GUARD_LEVELS, TOPICS, type Filter, type TopicId } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/curate")({
  head: () => ({
    meta: [
      { title: "Curate — Sona" },
      { name: "description", content: "Decide what gets through: eight topics, three settings each, and a guard level." },
      { property: "og:title", content: "Curate — Sona" },
      { property: "og:description", content: "Decide what gets through before it reaches you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Curate />
    </AppShell>
  ),
});

function Curate() {
  const { profile, update } = useSona();
  const floors = topicFloors(profile.ageMode, profile.care);
  const prefs: FeedPrefs = {
    curate: profile.settings.curate,
    guard: profile.settings.guard,
    vibe: profile.settings.vibe,
    ageMode: profile.ageMode,
    care: profile.care,
  };
  const counts = useMemo(
    () => Object.fromEntries(GUARD_LEVELS.map((g) => [g.id, guardCounts(POSTS, prefs, g.id)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(prefs)],
  );
  const guard = effectiveGuard(profile.ageMode, profile.settings.guard);

  function setTopic(t: TopicId, f: Filter) {
    update({ settings: { curate: { ...profile.settings.curate, [t]: f } } });
  }

  return (
    <>
      <PageHeader eyebrow="Before it reaches you" title="Curate" sub="Eight topics, three settings each. Care profile floors can't be loosened.">
        <SonaFigure look={profile.look} doodle={profile.doodle} pose="box" className="hidden w-20 md:block" />
      </PageHeader>

      <section>
        <h2 className="heading-calm text-3xl">Guard level</h2>
        <p className="subline">How intense a post can be before it's softened or held.</p>
        {profile.ageMode === "sapling" && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-care-soft px-3 py-1.5 text-sm text-care">
            <Lock className="size-3.5" /> Sapling mode keeps the guard on Strict.
          </p>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {GUARD_LEVELS.map((g) => {
            const c = counts[g.id]!;
            const active = guard === g.id;
            const disabled = profile.ageMode === "sapling" && g.id !== "strict";
            return (
              <button
                key={g.id}
                disabled={disabled}
                onClick={() => update({ settings: { guard: g.id } })}
                aria-pressed={active}
                className={cn(
                  "rounded-[1.75rem] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
                  active ? "border-ink bg-ink text-ink-foreground shadow-float" : "border-border bg-card hover:border-foreground/40",
                )}
              >
                <p className="heading-calm text-3xl">{g.label}</p>
                <p className={cn("subline mt-1 text-sm", active && "text-ink-foreground/70")}>{g.blurb}</p>
                <div className="mt-4 flex gap-3 text-xs">
                  <span>
                    <strong className="text-base font-medium">{c.shown}</strong> in
                  </span>
                  <span>
                    <strong className="text-base font-medium">{c.softened}</strong> softened
                  </span>
                  <span>
                    <strong className="text-base font-medium">{c.held}</strong> held
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="heading-calm text-3xl">Topics</h2>
        <p className="subline">Let in, label only (a short summary first, then you decide), soften (blurred until you tap), or hold back (a quiet line).</p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {TOPICS.map((t) => {
            const floor = floors[t.id];
            const value: Filter = FILTER_RANK[profile.settings.curate[t.id]] >= FILTER_RANK[floor.floor] ? profile.settings.curate[t.id] : floor.floor;
            const locked = floor.floor !== "show";
            const isCare = floor.sources.some((s) => s !== "Sapling mode");
            return (
              <li key={t.id} className={cn("rounded-[1.75rem] border bg-card p-5", isCare ? "border-care/40" : "border-border")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.label}</p>
                    <p className="text-sm text-muted-foreground">{t.hint}</p>
                  </div>
                  {locked && (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs",
                        isCare ? "bg-care-soft text-care" : "bg-secondary text-muted-foreground",
                      )}
                      title={`Locked by ${floor.sources.join(", ")}`}
                    >
                      {isCare ? <HeartHandshake className="size-3" /> : <Lock className="size-3" />}
                      {isCare ? "care" : "sapling"} · {floor.sources.join(", ")}
                    </span>
                  )}
                </div>
                <div role="radiogroup" aria-label={t.label} className="mt-4 grid grid-cols-4 gap-1 rounded-full bg-secondary p-1">
                  {FILTERS.map((f) => {
                    const disabled = FILTER_RANK[f.id] < FILTER_RANK[floor.floor];
                    const on = value === f.id;
                    return (
                      <button
                        key={f.id}
                        role="radio"
                        aria-checked={on}
                        disabled={disabled}
                        onClick={() => setTopic(t.id, f.id)}
                        className={cn(
                          "rounded-full px-1 py-1.5 text-xs transition sm:text-sm disabled:cursor-not-allowed disabled:opacity-35",
                          on ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
