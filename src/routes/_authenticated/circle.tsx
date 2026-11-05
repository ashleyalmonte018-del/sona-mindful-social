import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layers, Music2, Search, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { MoodDot, MoodPicker } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { OnlineMatch } from "@/components/zone/OnlineMatch";
import { DoodleTitle, GAMES, type Players } from "@/components/zone/Games";
import { useCircleMembers, useCircleTiers, type CircleMember } from "@/hooks/use-circle";
import { usePeopleCards } from "@/hooks/use-social";
import { supabase } from "@/integrations/supabase/client";
import { CIRCLE_TIERS, filterByTier, tierCounts, tierLabel, type TierId } from "@/lib/sona/tiers";
import { moodColor, moodLabel, type MoodId, type SonaLook } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/circle")({
  head: () => ({
    meta: [
      { title: "Circle — Sona" },
      { name: "description", content: "Your circle's pocket world: Sonas with their song and mood, minigames, and private circle tiers." },
      { property: "og:title", content: "Circle — Sona" },
      { property: "og:description", content: "Hang out with your circle's Sonas, share a song and a mood, and sort people into tiers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell wide>
      <CirclePage />
    </AppShell>
  ),
});

const ACTIONS = [
  { id: "sit", label: "Sit", pose: "sit", emote: "☁️" },
  { id: "play", label: "Play", pose: "jump", emote: "⚽" },
  { id: "wave", label: "Wave", pose: "wave", emote: "👋" },
  { id: "cheer", label: "Cheer", pose: "cheer", emote: "🎉" },
  { id: "dance", label: "Dance", pose: "dance", emote: "🎵" },
  { id: "hug", label: "Love", pose: "hug", emote: "💛" },
  { id: "rest", label: "Rest", pose: "rest", emote: "💤" },
] as const;

const MAX_VISITORS = 7;

interface Buddy {
  id: string;
  name: string;
  look: SonaLook;
  pose: string;
  emote?: string | undefined;
  x: number;
  mine?: boolean;
  song: string | null;
  mood: MoodId | null;
}

function CirclePage() {
  const { profile, update } = useSona();
  const s = profile.settings;
  const quiet = s.quietMode;
  const allow = s.allowInteractions;

  const membersQ = useCircleMembers();
  const real = membersQ.data ?? [];
  const usingSamples = membersQ.isSuccess && real.length === 0;
  const members = real;
  const tiers = useCircleTiers(profile.id);
  const [tierFilter, setTierFilter] = useState<TierId | "all">("all");

  const zoneIds = s.zone ?? [];
  const visitors = useMemo(() => {
    if (!allow) return [];
    return members
      .filter((m) => zoneIds.includes(m.id))
      .filter((m) => m.allowsPlay)
      .slice(0, MAX_VISITORS);
  }, [allow, members, zoneIds]);

  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [selected, setSelected] = useState<string>("me");
  const [game, setGame] = useState<(typeof GAMES)[number] | null>(null);
  const [opponent, setOpponent] = useState<string>("practice");

  useEffect(() => {
    const n = visitors.length + 1;
    const slot = (i: number) => 8 + ((i + 1) * 84) / (n + 1);
    const meIndex = Math.floor(n / 2);
    const me: Buddy = {
      id: "me",
      name: profile.look.name || "You",
      look: profile.look,
      pose: "wave",
      x: slot(meIndex),
      mine: true,
      song: quiet ? null : s.share.song,
      mood: quiet ? null : s.share.mood,
    };
    const others = visitors.map((m, i) => ({
      id: m.id,
      name: m.name,
      look: m.look,
      pose: m.look.pose,
      x: slot(i >= meIndex ? i + 1 : i),
      song: quiet || m.quiet ? null : m.song,
      mood: quiet || m.quiet ? null : m.mood,
    }));
    setBuddies([me, ...others]);
    if (!members.some((v) => v.id === opponent && v.allowsPlay)) setOpponent("practice");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.look, visitors, members, quiet, s.share.song, s.share.mood]);

  // Idle wandering for visitors
  useEffect(() => {
    const t = window.setInterval(() => {
      setBuddies((bs) => bs.map((b) => (b.mine || Math.random() < 0.5 ? b : { ...b, x: Math.max(6, Math.min(92, b.x + (Math.random() * 16 - 8))) })));
    }, 4500);
    return () => window.clearInterval(t);
  }, []);

  function act(id: string, a: (typeof ACTIONS)[number]) {
    setBuddies((bs) => bs.map((b) => (b.id === id ? { ...b, pose: a.pose, emote: a.emote } : b)));
    window.setTimeout(() => setBuddies((bs) => bs.map((b) => (b.id === id ? { ...b, emote: undefined } : b))), 2200);
  }

  const sel = buddies.find((b) => b.id === selected);
  const opp = members.find((f) => f.id === opponent);
  const players: Players = {
    me: { name: "You", look: profile.look },
    them: opp ? { name: opp.name, look: opp.look } : { name: profile.look.name || "Sona", look: { ...profile.look, skin: "#f3f4f1" } },
  };

  return (
    <>
      <PageHeader eyebrow="Your pocket world" title="Circle" sub="Your circle's Sonas hang out here with just a song and a mood. No posts, no seen-receipts." />

      <ShareBar />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {!s.sonaEnabled ? (
            <div className="flex h-[26rem] flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-border text-center">
              <SonaFigure pose="rest" className="w-24" />
              <p className="heading-calm mt-4 text-3xl">Your Sona is resting</p>
              <p className="subline mt-1">Wake your Sona to visit the pocket world.</p>
              <Button variant="ink" className="mt-5" onClick={() => update({ settings: { sonaEnabled: true } })}>
                Wake my Sona
              </Button>
            </div>
          ) : (
            <>
              <section aria-label="Pocket world" className="relative h-[28rem] overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-soft">
                <div className="absolute inset-0 bg-glow" />
                <div className="absolute inset-x-[-10%] bottom-[-38%] h-[70%] rounded-[50%] bg-lime-soft" />
                <svg viewBox="0 0 80 120" className="absolute bottom-[18%] left-[3%] w-16 md:w-24" aria-hidden>
                  <rect x={36} y={60} width={8} height={56} rx={4} fill="var(--prop-brown)" stroke="var(--sona-line)" strokeWidth={1.5} />
                  <circle cx={40} cy={44} r={30} fill="var(--lime)" stroke="var(--sona-line)" strokeWidth={1.5} />
                  <circle cx={26} cy={52} r={16} fill="var(--lime)" stroke="var(--sona-line)" strokeWidth={1.5} />
                </svg>
                <svg viewBox="0 0 100 50" className="absolute bottom-[16%] right-[4%] w-20 md:w-28" aria-hidden>
                  <rect x={6} y={14} width={88} height={8} rx={4} fill="var(--prop-orange)" stroke="var(--sona-line)" strokeWidth={1.5} />
                  <rect x={6} y={26} width={88} height={8} rx={4} fill="var(--prop-orange)" stroke="var(--sona-line)" strokeWidth={1.5} />
                  <path d="M16 34 L14 48 M84 34 L86 48" stroke="var(--sona-line)" strokeWidth={3} strokeLinecap="round" />
                </svg>

                {buddies.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                    className={cn("absolute bottom-[10%] flex -translate-x-1/2 flex-col items-center transition-[left] duration-[2000ms] ease-in-out", b.id === selected && "z-10")}
                    style={{ left: `${b.x}%` }}
                    aria-label={`${b.mine ? "Your Sona" : b.name}${b.song ? `, listening to ${b.song}` : ""}${b.mood ? `, feeling ${moodLabel(b.mood)}` : ""}`}
                  >
                    {b.emote && <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-2xl animate-pop">{b.emote}</span>}
                    {/* What they're sharing floats above their head */}
                    {b.song || b.mood ? (
                      <span className="mb-1 flex max-w-[8.5rem] items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-0.5 text-[0.68rem] shadow-soft">
                        {b.mood && <MoodDot color={moodColor(b.mood)} className="size-2 shrink-0" />}
                        {b.song && (
                          <>
                            <Music2 className="size-2.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{b.song}</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="mb-1 h-5" aria-hidden />
                    )}
                    <SonaFigure
                      look={b.look}
                      doodle={b.mine ? profile.doodle : undefined}
                      pose={b.pose}
                      className={cn("w-14 md:w-20", b.pose === "jump" && "animate-hop", b.pose === "dance" && "animate-wiggle")}
                    />
                    <span className={cn("mt-1 block w-fit rounded-full px-2 py-0.5 text-xs", b.id === selected ? "bg-ink text-ink-foreground" : "bg-card/80 text-muted-foreground")}>
                      {b.mine ? "You" : b.name}
                    </span>
                  </button>
                ))}
              </section>

              {sel && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="mr-2 text-sm text-muted-foreground">{sel.mine ? "Your Sona" : sel.name}:</span>
                  {ACTIONS.map((a) => (
                    <Button key={a.id} size="sm" variant="soft" onClick={() => act(sel.id, a)}>
                      <span>{a.emote}</span> {a.label}
                    </Button>
                  ))}
                  {sel.mine && (
                    <Button asChild size="sm" variant="ghost" className="ml-auto">
                      <Link to="/studio">Customize in Studio</Link>
                    </Button>
                  )}
                </div>
              )}
              {!allow && <p className="subline mt-3 text-sm">Visits are off — it's just you and your Sona. Turn visits on in the side panel to play with your circle.</p>}
              {allow && usingSamples && <p className="mt-3 text-xs text-muted-foreground">Your circle is empty for now. Follow someone and have them follow you back, and their Sona will appear here.</p>}
              {allow && !usingSamples && visitors.length === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">Your Zone is empty — pick who visits from the side panel.</p>)}
            </>
          )}

          <GameHistory myId={profile.id} />

          {/* Minigames */}
          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="heading-calm text-4xl">Minigames</h2>
                <p className="subline">Quick rounds, then back to real life.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Play with</span>
                <button onClick={() => setOpponent("practice")} className={cn("rounded-full border px-3 py-1", opponent === "practice" ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card")}>
                  My Sona
                </button>
                {members.filter((f) => f.allowsPlay).map((f) => (
                  <button key={f.id} onClick={() => setOpponent(f.id)} className={cn("rounded-full border px-3 py-1", opponent === f.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card")}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {GAMES.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => setGame(g)}
                  className="group relative overflow-hidden rounded-[2rem] border border-border bg-doodle-paper p-6 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-float"
                >
                  <SonaFigure pose={["think", "cheer", "jump", "box"][i] ?? "wave"} className="absolute -bottom-3 -right-2 w-20 opacity-90 transition group-hover:scale-105" noShadow />
                  <DoodleTitle text={g.title} className="text-3xl leading-tight" />
                  <p className="mt-2 max-w-[60%] text-sm text-muted-foreground">{g.blurb}</p>
                </button>
              ))}
            </div>
          </section>
          <OnlineMatch myId={profile.id} />
        </div>

        <CircleSidePanel members={real} usingSamples={usingSamples} loading={membersQ.isLoading} tierFilter={tierFilter} onTierFilter={setTierFilter} tiers={tiers} />
      </div>

      <Dialog open={!!game} onOpenChange={(o) => !o && setGame(null)}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          {game && (
            <>
              <DialogHeader>
                <DialogTitle>
                  <DoodleTitle text={game.title} className="text-3xl" />
                </DialogTitle>
                <DialogDescription>Playing with {players.them.name}</DialogDescription>
              </DialogHeader>
              {opponent === "practice" ? <game.C players={players} /> : <OnlineMatch key={`${game.id}:${opponent}`} myId={profile.id} opponentId={opponent} game={game.id} players={players} fallback={<game.C players={players} />} />}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const GAME_LABELS: Record<string, string> = {
  ttt: "Tic-Tac-Toe",
  rps: "Rock, Paper, Scissors",
  oe: "Odds or Evens",
  dots: "Dots and Boxes",
};

function GameHistory({ myId }: { myId: string }) {
  const resultsQ = useQuery({
    queryKey: ["game-history", myId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_results")
        .select("id,game,winner_id,loser_id,player_a_id,player_b_id,created_at")
        .or(`player_a_id.eq.${myId},player_b_id.eq.${myId}`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
  const opponentIds = (resultsQ.data ?? []).map((result) => result.player_a_id === myId ? result.player_b_id : result.player_a_id);
  const peopleQ = usePeopleCards(opponentIds);

  return (
    <section aria-label="Game record" className="mt-12 rounded-[2rem] border border-border bg-card p-5 shadow-soft">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted-foreground">Circle record</p>
          <h2 className="heading-calm text-3xl">Wins & losses</h2>
        </div>
        <span className="text-xs text-muted-foreground">Your last 20 rounds</span>
      </div>
      {resultsQ.error ? (
        <p className="mt-4 text-sm text-muted-foreground">Game records will appear after the latest database migration.</p>
      ) : resultsQ.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading your record…</p>
      ) : (resultsQ.data ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Finish a round with a Circle member and your record will appear here.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {(resultsQ.data ?? []).map((result) => {
            const opponentId = result.player_a_id === myId ? result.player_b_id : result.player_a_id;
            const opponent = peopleQ.data?.[opponentId];
            const outcome = result.winner_id === null ? "Draw" : result.winner_id === myId ? "Win" : "Loss";
            return (
              <div key={result.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{GAME_LABELS[result.game] ?? result.game} · {opponent?.display_name ?? "Circle member"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(result.created_at).toLocaleString()}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs", outcome === "Win" ? "bg-lime-soft text-foreground" : outcome === "Loss" ? "bg-orange-soft text-foreground" : "bg-muted text-muted-foreground")}>{outcome}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Mood + song sharing, shown above the pocket world. */
function ShareBar() {
  const { profile, update } = useSona();
  const share = profile.settings.share;
  const quiet = profile.settings.quietMode;
  const [song, setSong] = useState(share.song);
  const [artist, setArtist] = useState(share.artist);

  return (
    <section aria-label="What you're sharing" className="rounded-[2rem] border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-5 md:flex-row md:items-end">
        <div className="flex items-center gap-3 md:w-60 md:shrink-0">
          <SonaFigure look={profile.look} doodle={profile.doodle} pose="sing" className="w-12 shrink-0" />
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">You're sharing</p>
            {quiet ? (
              <p className="subline text-sm">Nothing — quiet mode</p>
            ) : (
              <p className="flex items-center gap-1.5 text-sm">
                <MoodDot color={moodColor(share.mood)} /> <span className="truncate">{share.song} — {share.artist}</span>
              </p>
            )}
          </div>
        </div>
        <form
          className="grid flex-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            update({ settings: { share: { ...share, song: song.trim().slice(0, 80), artist: artist.trim().slice(0, 80) } } }, { immediate: true });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="song">Song</Label>
            <Input id="song" value={song} onChange={(e) => setSong(e.target.value)} maxLength={80} className="rounded-full" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artist">Artist</Label>
            <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={80} className="rounded-full" />
          </div>
          <Button type="submit" variant="ink">
            Share song
          </Button>
        </form>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <p className="text-sm">Mood dot</p>
        <MoodPicker size="sm" value={share.mood} onPick={(m) => update({ settings: { share: { ...share, mood: m } } })} />
      </div>
    </section>
  );
}

function CircleSidePanel({
  members,
  usingSamples,
  loading,
  tierFilter,
  onTierFilter,
  tiers,
}: {
  members: CircleMember[];
  usingSamples: boolean;
  loading: boolean;
  tierFilter: TierId | "all";
  onTierFilter: (t: TierId | "all") => void;
  tiers: ReturnType<typeof useCircleTiers>;
}) {
  const { profile, update } = useSona();
  const s = profile.settings;
  const counts = tierCounts(tiers.byMember);
  const listed = filterByTier(members, tiers.byMember, tierFilter);
    const zone = s.zone ?? [];
  const inZone = (id: string) => zone.includes(id);
  const setZone = (id: string, on: boolean) =>
    update({ settings: { zone: on ? [...zone, id] : zone.filter((z) => z !== id) } });
  const setAllZone = (ids: string[]) => update({ settings: { zone: ids } });

  return (
    <aside aria-label="Circle controls" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-[2rem] border border-border bg-card p-5 shadow-soft">
        <h2 className="heading-calm text-2xl">Circle controls</h2>
        <div className="mt-3 divide-y divide-border">
          <div className="flex items-center justify-between gap-3 py-3">
            <div>
              <Label htmlFor="quiet">Quiet mode</Label>
              <p className="text-xs text-muted-foreground">Hide your share and mute your circle</p>
            </div>
            <Switch id="quiet" checked={s.quietMode} onCheckedChange={(v) => update({ settings: { quietMode: v } })} />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <div>
              <Label htmlFor="allow">Let my circle's Sonas visit</Label>
              <p className="text-xs text-muted-foreground">They can hang out and play minigames</p>
            </div>
            <Switch id="allow" checked={s.allowInteractions} onCheckedChange={(v) => update({ settings: { allowInteractions: v } })} />
          </div>
        </div>
      </section>

            <section className="rounded-[2rem] border border-border bg-card p-5 shadow-soft">
              <h2 className="heading-calm sparkle text-2xl">Your Zone</h2>
        <p className="subline text-sm">Pick whose Sonas visit your pocket world.</p>
        {members.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-secondary p-4 text-sm">
            <p>Your Zone starts empty. Follow people (and have them follow you back), then choose who appears here.</p>
          </div>
        ) : (
          <>
          <ul className="mt-3 divide-y divide-border">
            {members.map((m) => {
              const id = `zone-${m.id}`;
              return (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <Checkbox id={id} checked={inZone(m.id)} onCheckedChange={(v) => setZone(m.id, v === true)} />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={id} className="cursor-pointer truncate font-normal text-sm">{m.name}</Label>
                    {m.handle && <p className="truncate text-xs text-muted-foreground">@{m.handle}</p>}
                  </div>
{inZone(m.id) && (
  <span className="text-xs text-muted-foreground" aria-live="polite">
    In your Zone
  </span>
)}
                </li>
              );
            })}
          </ul>
                      <div className="mt-3 flex gap-2" role="group" aria-label="Zone quick actions">
              <Button
                variant="soft"
                size="sm"
                disabled={zone.length === members.length}
                onClick={() => setAllZone(members.map((m) => m.id))}
              >
                Add everyone
              </Button>
              <Button variant="ghost" size="sm" disabled={zone.length === 0} onClick={() => setAllZone([])}>
                Clear
              </Button>
            </div>
            </>

        )}
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-5 shadow-soft">
        <h2 className="heading-calm flex items-center gap-2 text-2xl">
          Tiers <Layers className="size-5 text-muted-foreground" />
        </h2>
        <p className="subline text-sm">Sort your circle privately. Nobody sees which tier they're in.</p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Show tier">
          <TierChip label="Everyone" count={members.length} on={tierFilter === "all"} onClick={() => onTierFilter("all")} />
          {CIRCLE_TIERS.map((t) => (
            <TierChip key={t.id} label={t.label} count={counts[t.id]} on={tierFilter === t.id} onClick={() => onTierFilter(t.id)} />
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="eyebrow text-muted-foreground">Members</p>
          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading your circle…</p>
          ) : usingSamples ? (
            <div className="mt-2 rounded-2xl bg-secondary p-4 text-sm">
              <p>Your circle is people who follow each other. Once someone's in, you can sort them into tiers here.</p>
              <Button asChild variant="pill" size="sm" className="mt-3">
                <Link to="/people">
                  <Search /> Find people
                </Link>
              </Button>
            </div>
          ) : listed.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nobody in {tierFilter === "all" ? "your circle" : tierLabel(tierFilter)} yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {listed.map((m) => (
                <MemberRow key={m.id} member={m} tiers={tiers.byMember[m.id] ?? []} onToggle={(tier, on) => tiers.toggle.mutate({ memberId: m.id, tier, on })} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </aside>
  );
}

function TierChip({ label, count, on, onClick }: { label: string; count: number; on: boolean; onClick: () => void }) {
  return (
    <button
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn("rounded-full border px-2.5 py-1 text-xs transition", on ? "border-ink bg-ink text-ink-foreground" : "border-border bg-background hover:border-foreground/40")}
    >
      {label} <span className={on ? "text-ink-foreground/70" : "text-muted-foreground"}>{count}</span>
    </button>
  );
}

function MemberRow({ member, tiers, onToggle }: { member: CircleMember; tiers: TierId[]; onToggle: (t: TierId, on: boolean) => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl p-2 hover:bg-secondary/60">
      <Link to="/chat/$id" params={{ id: member.id }} className="flex size-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-secondary" aria-label={`Chat with ${member.name}`}>
        <SonaFigure look={member.look} pose="stand" noShadow className="-mb-3 h-12" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to="/chat/$id" params={{ id: member.id }} className="truncate text-sm font-medium hover:underline">{member.name}</Link>
        <p className="truncate text-xs text-muted-foreground">{tiers.length ? tiers.map(tierLabel).join(" · ") : "Not sorted yet"}</p>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="soft" aria-label={`Choose tiers for ${member.name}`}>
            <Tag /> Tiers
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 rounded-2xl">
          <p className="text-sm font-medium">{member.name}'s tiers</p>
          <p className="text-xs text-muted-foreground">Pick as many as fit.</p>
          <div className="mt-3 space-y-2.5">
            {CIRCLE_TIERS.map((t) => {
              const id = `tier-${member.id}-${t.id}`;
              const on = tiers.includes(t.id);
              return (
                <div key={t.id} className="flex items-start gap-2.5">
                  <Checkbox id={id} checked={on} onCheckedChange={(v) => onToggle(t.id, v === true)} className="mt-0.5" />
                  <Label htmlFor={id} className="cursor-pointer font-normal leading-tight">
                    {t.label}
                    <span className="block text-xs text-muted-foreground">{t.blurb}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </li>
  );
}
