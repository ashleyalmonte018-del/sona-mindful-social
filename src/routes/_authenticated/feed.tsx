import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CirclePanel } from "@/components/feed/CirclePanel";
import { HeldLine, PostCard } from "@/components/feed/PostCard";
import { AppShell } from "@/components/shell/AppShell";
import { BreathingPrompt } from "@/components/shell/BreathingPrompt";
import { MoodDot, MoodPicker } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { useMoods } from "@/hooks/use-sona-profile";
import { buildEdition, categoriesFor, type FeedPrefs, type Judged } from "@/lib/sona/engine";
import { POSTS } from "@/lib/sona/posts";
import { CATEGORIES, moodColor, moodLabel, type PostCategory } from "@/lib/sona/types";
import { editionKey, editionName, nextEditionLabel, readRatings, readSeen, writeRatings, writeSeen } from "@/lib/sona/usage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Your edition — Sona" },
      { name: "description", content: "Today's finite, filtered Sona edition." },
      { property: "og:title", content: "Your edition — Sona" },
      { property: "og:description", content: "A finite feed that filters before it reaches you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell wide>
      <Feed />
    </AppShell>
  ),
});

const REFLECTIONS = [
  { q: "What do you want from the next few minutes?", a: ["Learn something", "A laugh", "Check on friends", "Honestly, just bored"] },
  { q: "What made you open Sona just now?", a: ["I was curious", "Habit", "Avoiding something", "Waiting around"] },
  { q: "Is scrolling what you need right now?", a: ["Yes, a short break", "Maybe not", "I need people", "I need rest"] },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Feed() {
  const { profile } = useSona();
  const { moods, log, checkedInToday } = useMoods();
  const [tab, setTab] = useState<PostCategory>("inspiration");
  const [seen, setSeen] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [rated, setRated] = useState<Record<string, 1 | -1>>({});
  const [edKey, setEdKey] = useState("");
  const [shown, setShown] = useState<string[]>([]);
  const [refresh, setRefresh] = useState<"idle" | "breathing" | "reflect">("idle");
  const [reflection] = useState(() => REFLECTIONS[Math.floor(Math.random() * REFLECTIONS.length)]!);

  useEffect(() => {
    setSeen(readSeen());
    setRatings(readRatings());
    setRated(JSON.parse(localStorage.getItem("sona.rated") ?? "{}"));
    setEdKey(editionKey());
  }, []);

  const prefs: FeedPrefs = useMemo(
    () => ({
      curate: profile.settings.curate,
      guard: profile.settings.guard,
      vibe: profile.settings.vibe,
      ageMode: profile.ageMode,
      care: profile.care,
      ratings,
    }),
    [profile.settings.curate, profile.settings.guard, profile.settings.vibe, profile.ageMode, profile.care, ratings],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const edition = useMemo(() => buildEdition(POSTS, prefs), [prefs, edKey]);
  const cats = categoriesFor(profile.ageMode);
  const activeTab = cats.includes(tab) ? tab : cats[0];

  const onSeen = useCallback((id: string) => {
    setSeen((s) => {
      if (s.includes(id)) return s;
      const n = [...s, id];
      writeSeen(n);
      return n;
    });
  }, []);

  function rate(j: Judged, v: 1 | -1) {
    const prev = rated[j.post.id];
    const delta = prev === v ? -v : prev ? v * 2 : v;
    const nextRated = { ...rated };
    if (prev === v) delete nextRated[j.post.id];
    else nextRated[j.post.id] = v;
    setRated(nextRated);
    localStorage.setItem("sona.rated", JSON.stringify(nextRated));
    const nr = { ...ratings, [j.post.subgenre]: (ratings[j.post.subgenre] ?? 0) + delta };
    // Ratings shape the *next* edition; keep this one stable.
    writeRatings(nr);
  }

  const editionIds = edition.posts.map((p) => p.post.id);
  const seenCount = editionIds.filter((id) => seen.includes(id)).length;
  const caughtUp = edition.posts.length > 0 && seenCount >= edition.posts.length;

  const tabPosts = edition.posts
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.post.category === activeTab);
  const tabHeld = edition.held.filter((h) => h.judged.post.category === activeTab);
  const offline = edition.posts.map((p) => p.post.offline).filter(Boolean).slice(0, 3) as string[];
  const lastMood = moods[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        {/* Header */}
        <div className="relative">
          <SonaFigure look={profile.look} doodle={profile.doodle} pose="cheer" className="absolute -top-4 right-2 hidden w-16 md:block" />
          <SonaFigure pose="read" className="absolute -top-2 right-24 hidden w-14 md:block" noShadow />
          <p className="eyebrow text-muted-foreground">Your {editionName()} edition</p>
          <h1 className="heading-calm mt-2 text-5xl md:text-7xl">
            {greeting()},<br />
            {profile.displayName}
          </h1>
          <p className="subline mt-3 text-lg">
            {edition.limit} posts, then you're free. {edition.held.length} held back, {edition.softened} softened.
          </p>
        </div>

        {/* Mood check-in */}
        <div className="mt-6 rounded-[1.75rem] border border-border bg-card/70 p-5">
          {checkedInToday && lastMood ? (
            <p className="flex items-center gap-2 text-sm">
              <MoodDot color={moodColor(lastMood.mood)} /> Today you checked in as <strong className="font-medium">{moodLabel(lastMood.mood)}</strong>.
              <span className="text-muted-foreground">Thanks for noticing.</span>
            </p>
          ) : (
            <>
              <p className="text-sm">How are you arriving today?</p>
              <div className="mt-3">
                <MoodPicker size="sm" onPick={(m) => log.mutate({ mood: m, source: "daily" })} />
              </div>
            </>
          )}
        </div>

        {/* Progress + refresh */}
        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {seenCount} of {edition.posts.length} seen
              </span>
              <span>Next edition {nextEditionLabel()}</span>
            </div>
            <Progress value={(seenCount / Math.max(1, edition.posts.length)) * 100} className="mt-2 h-1.5 bg-secondary [&>div]:bg-ink" />
          </div>
          <Button variant="pill" size="sm" onClick={() => setRefresh("breathing")}>
            <RefreshCw /> Refresh
          </Button>
        </div>

        {caughtUp ? (
          <CaughtUp offline={offline} onRefresh={() => setRefresh("breathing")} look={profile.look} />
        ) : (
          <>
            {/* Category tabs */}
            <div role="tablist" aria-label="Feed buckets" className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
              {cats.map((c) => {
                const meta = CATEGORIES.find((x) => x.id === c)!;
                const count = edition.posts.filter((p) => p.post.category === c).length;
                return (
                  <button
                    key={c}
                    role="tab"
                    aria-selected={activeTab === c}
                    onClick={() => setTab(c)}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition",
                      activeTab === c ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {meta.label} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
            <p className="subline mt-2 text-sm">{CATEGORIES.find((c) => c.id === activeTab)?.blurb}</p>

            <div className="mt-5 space-y-4">
              {tabPosts.length === 0 && tabHeld.length === 0 && (
                <p className="rounded-[1.75rem] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nothing in this bucket for this edition.
                </p>
              )}
              {tabHeld.filter((h) => h.after < 0).map((h) => (
                <HeldOrShown key={h.judged.post.id} judged={h.judged} shown={shown} setShown={setShown} onSeen={onSeen} rated={rated} rate={rate} />
              ))}
              {tabPosts.map(({ p, i }) => (
                <div key={p.post.id} className="space-y-4">
                  <PostCard judged={p} onSeen={onSeen} rating={rated[p.post.id]} onRate={(v) => rate(p, v)} />
                  {tabHeld
                    .filter((h) => h.after === i)
                    .map((h) => (
                      <HeldOrShown key={h.judged.post.id} judged={h.judged} shown={shown} setShown={setShown} onSeen={onSeen} rated={rated} rate={rate} />
                    ))}
                </div>
              ))}
              {tabHeld
                .filter((h) => h.after >= 0 && !tabPosts.some(({ i }) => i === h.after))
                .map((h) => (
                  <HeldOrShown key={h.judged.post.id} judged={h.judged} shown={shown} setShown={setShown} onSeen={onSeen} rated={rated} rate={rate} />
                ))}
            </div>
            {tabPosts.length > 0 && tabPosts.every(({ p }) => seen.includes(p.post.id)) && (
              <p className="subline mt-6 text-center">This bucket is done. Peek at another, or close the app — both are wins.</p>
            )}
          </>
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="relative">
          <SonaFigure pose="read" className="absolute -top-[4.6rem] right-6 w-16" noShadow />
          <CirclePanel />
        </div>
        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
          <h2 className="heading-calm text-2xl">Today's filter</h2>
          <p className="subline text-sm">What happened before it reached you</p>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat n={edition.posts.length - edition.softened} label="let in" />
            <Stat n={edition.softened} label="softened" />
            <Stat n={edition.held.length} label="held" />
          </dl>
          {profile.care.length > 0 && (
            <p className="mt-3 rounded-2xl bg-care-soft px-3 py-2 text-xs text-care">Care profile active — some filters are locked.</p>
          )}
          <div className="mt-4 flex gap-2">
            <Button asChild size="sm" variant="pill" className="flex-1">
              <Link to="/curate">Curate</Link>
            </Button>
            <Button asChild size="sm" variant="pill" className="flex-1">
              <Link to="/vibe">Vibe</Link>
            </Button>
          </div>
        </section>
        <div className="flex items-end justify-center gap-4 pt-2">
          <SonaFigure pose="megaphone" className="w-14" />
          <SonaFigure pose="box" className="w-14" />
          <SonaFigure pose="sit" className="w-14" />
        </div>
      </aside>

      <Dialog open={refresh !== "idle"} onOpenChange={(o) => !o && setRefresh("idle")}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <p className="eyebrow text-muted-foreground">Before anything new loads</p>
            <DialogTitle className="heading-calm text-3xl">{refresh === "breathing" ? "One breath first" : reflection.q}</DialogTitle>
            <DialogDescription className="subline">
              {refresh === "breathing" ? "No pull-to-refresh rush here." : "Pick the closest answer."}
            </DialogDescription>
          </DialogHeader>
          {refresh === "breathing" ? (
            <BreathingPrompt onDone={() => setRefresh("reflect")} className="py-4" />
          ) : (
            <div className="grid gap-2">
              {reflection.a.map((a, i) => (
                <Button
                  key={a}
                  variant="soft"
                  className="justify-start"
                  onClick={() => {
                    setRefresh("idle");
                    const k = editionKey();
                    setEdKey(k);
                    setSeen(readSeen());
                    if (i === 3) window.dispatchEvent(new Event("sona:offline-nudge"));
                  }}
                >
                  {a}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeldOrShown({
  judged,
  shown,
  setShown,
  onSeen,
  rated,
  rate,
}: {
  judged: Judged;
  shown: string[];
  setShown: (f: (s: string[]) => string[]) => void;
  onSeen: (id: string) => void;
  rated: Record<string, 1 | -1>;
  rate: (j: Judged, v: 1 | -1) => void;
}) {
  if (shown.includes(judged.post.id)) {
    const softened = { ...judged, verdict: "soften" as const };
    return <PostCard judged={softened} onSeen={() => undefined} rating={rated[judged.post.id]} onRate={(v) => rate(judged, v)} />;
  }
  void onSeen;
  return <HeldLine judged={judged} onShow={() => setShown((s) => [...s, judged.post.id])} />;
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-2 py-3">
      <dt className="sr-only">{label}</dt>
      <dd className="heading-calm text-3xl">{n}</dd>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CaughtUp({ offline, onRefresh, look }: { offline: string[]; onRefresh: () => void; look: Parameters<typeof SonaFigure>[0]["look"] }) {
  return (
    <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-border bg-card p-8 text-center shadow-soft md:p-12">
      <div className="absolute inset-0 bg-glow opacity-70" />
      <div className="relative">
        <div className="flex items-end justify-center gap-3">
          <SonaFigure pose="jump" className="w-16 animate-bob" noShadow />
          <SonaFigure look={look} pose="cheer" className="w-24" />
          <SonaFigure pose="sit" className="w-16" noShadow />
        </div>
        <p className="eyebrow mt-6 text-muted-foreground">Edition complete</p>
        <h2 className="heading-calm mt-2 text-5xl md:text-6xl">You're all caught up</h2>
        <p className="subline mx-auto mt-3 max-w-md text-lg">That's everything for now. The feed is locked until {nextEditionLabel()}.</p>
        {offline.length > 0 && (
          <div className="mx-auto mt-8 max-w-md text-left">
            <p className="eyebrow text-muted-foreground">Take it offline</p>
            <ul className="mt-3 space-y-2">
              {offline.map((o) => (
                <li key={o} className="rounded-full border border-border bg-background/70 px-4 py-2 text-sm">
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild variant="ink">
            <Link to="/zone">Visit the Zone</Link>
          </Button>
          <Button variant="pill" onClick={onRefresh}>
            Check for a new edition
          </Button>
        </div>
      </div>
    </section>
  );
}
