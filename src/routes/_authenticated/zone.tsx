import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { DoodleTitle, GAMES, type Players } from "@/components/zone/Games";
import { CIRCLE } from "@/lib/sona/circle";
import type { SonaLook } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/zone")({
  head: () => ({
    meta: [
      { title: "The Zone — Sona" },
      { name: "description", content: "A pocket world where your Sona and your circle's Sonas sit, play and emote." },
      { property: "og:title", content: "The Zone — Sona" },
      { property: "og:description", content: "Hang out with Sonas and play four doodle minigames." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell wide>
      <Zone />
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

interface Buddy {
  id: string;
  name: string;
  look: SonaLook;
  pose: string;
  emote?: string;
  x: number;
  mine?: boolean;
}

function Zone() {
  const { profile, update, } = useSona();
  const allow = profile.settings.allowInteractions;
  const visitors = useMemo(() => (allow ? CIRCLE.filter((f) => f.allowsPlay) : []), [allow]);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [selected, setSelected] = useState<string>("me");
  const [game, setGame] = useState<(typeof GAMES)[number] | null>(null);
  const [opponent, setOpponent] = useState<string>("practice");

  useEffect(() => {
    const me: Buddy = { id: "me", name: profile.look.name || "You", look: profile.look, pose: "wave", x: 46, mine: true };
    const others = visitors.map((f, i) => ({ id: f.id, name: f.name, look: f.look, pose: f.look.pose, x: [14, 72, 30, 86][i % 4] }));
    setBuddies([me, ...others]);
    if (!allow) setOpponent("practice");
  }, [profile.look, visitors, allow]);

  // Idle wandering for visitors
  useEffect(() => {
    const t = window.setInterval(() => {
      setBuddies((bs) => bs.map((b) => (b.mine || Math.random() < 0.5 ? b : { ...b, x: Math.max(6, Math.min(90, b.x + (Math.random() * 24 - 12))) })));
    }, 4500);
    return () => window.clearInterval(t);
  }, []);

  function act(id: string, a: (typeof ACTIONS)[number]) {
    setBuddies((bs) => bs.map((b) => (b.id === id ? { ...b, pose: a.pose, emote: a.emote } : b)));
    window.setTimeout(() => setBuddies((bs) => bs.map((b) => (b.id === id ? { ...b, emote: undefined } : b))), 2200);
  }

  const sel = buddies.find((b) => b.id === selected);
  const opp = CIRCLE.find((f) => f.id === opponent);
  const players: Players = {
    me: { name: "You", look: profile.look },
    them: opp ? { name: opp.name, look: opp.look } : { name: profile.look.name || "Sona", look: { ...profile.look, skin: "#f3f4f1" } },
  };

  if (!profile.settings.sonaEnabled) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <SonaFigure pose="rest" className="mx-auto w-24" />
        <h1 className="heading-calm mt-4 text-4xl">Your Sona is resting</h1>
        <p className="subline mt-2">Turn your Sona helper on to visit the Zone.</p>
        <Button variant="ink" className="mt-6" onClick={() => update({ settings: { sonaEnabled: true } })}>
          Wake my Sona
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="A pocket world" title="The Zone" sub="Where Sonas sit, play and emote freely. Tap one to make it do something.">
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
          <Label htmlFor="allow" className="text-sm">Let my circle's Sonas visit</Label>
          <Switch id="allow" checked={allow} onCheckedChange={(v) => update({ settings: { allowInteractions: v } })} />
        </div>
      </PageHeader>

      {/* Pocket world */}
      <section className="relative h-[26rem] overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-soft">
        <div className="absolute inset-0 bg-glow" />
        <div className="absolute inset-x-[-10%] bottom-[-38%] h-[70%] rounded-[50%] bg-lime-soft" />
        {/* Tree */}
        <svg viewBox="0 0 80 120" className="absolute bottom-[18%] left-[4%] w-20 md:w-28" aria-hidden>
          <rect x={36} y={60} width={8} height={56} rx={4} fill="var(--prop-brown)" stroke="var(--sona-line)" strokeWidth={1.5} />
          <circle cx={40} cy={44} r={30} fill="var(--lime)" stroke="var(--sona-line)" strokeWidth={1.5} />
          <circle cx={26} cy={52} r={16} fill="var(--lime)" stroke="var(--sona-line)" strokeWidth={1.5} />
        </svg>
        {/* Bench */}
        <svg viewBox="0 0 100 50" className="absolute bottom-[16%] right-[5%] w-24 md:w-32" aria-hidden>
          <rect x={6} y={14} width={88} height={8} rx={4} fill="var(--prop-orange)" stroke="var(--sona-line)" strokeWidth={1.5} />
          <rect x={6} y={26} width={88} height={8} rx={4} fill="var(--prop-orange)" stroke="var(--sona-line)" strokeWidth={1.5} />
          <path d="M16 34 L14 48 M84 34 L86 48" stroke="var(--sona-line)" strokeWidth={3} strokeLinecap="round" />
        </svg>
        {/* Ball */}
        <svg viewBox="0 0 20 20" className="absolute bottom-[14%] left-[62%] w-6 animate-bob" aria-hidden>
          <circle cx={10} cy={10} r={8} fill="var(--doodle-red)" stroke="var(--sona-line)" strokeWidth={1.2} />
          <path d="M3 9 Q10 13 17 9" stroke="var(--card)" strokeWidth={1.5} fill="none" />
        </svg>

        {buddies.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected(b.id)}
            className={cn("absolute bottom-[12%] -translate-x-1/2 transition-[left] duration-[2000ms] ease-in-out", b.id === selected && "z-10")}
            style={{ left: `${b.x}%` }}
            aria-label={`${b.name}${b.mine ? " (your Sona)" : ""}`}
          >
            {b.emote && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-pop">{b.emote}</span>}
            <SonaFigure look={b.look} doodle={b.mine ? profile.doodle : undefined} pose={b.pose} className={cn("w-16 md:w-24", b.pose === "jump" && "animate-hop", b.pose === "dance" && "animate-wiggle")} />
            <span className={cn("mx-auto mt-1 block w-fit rounded-full px-2 py-0.5 text-xs", b.id === selected ? "bg-ink text-ink-foreground" : "bg-card/80 text-muted-foreground")}>
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
      {!allow && <p className="subline mt-3 text-sm">Visitors are off — it's just you and your Sona. Turn visits on to play with your circle.</p>}

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
            {visitors.map((f) => (
              <button key={f.id} onClick={() => setOpponent(f.id)} className={cn("rounded-full border px-3 py-1", opponent === f.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card")}>
                {f.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setGame(g)}
              className="group relative overflow-hidden rounded-[2rem] border border-border bg-doodle-paper p-6 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-float"
            >
              <SonaFigure pose={["think", "cheer", "jump", "box"][i]} className="absolute -bottom-3 -right-2 w-20 opacity-90 transition group-hover:scale-105" noShadow />
              <DoodleTitle text={g.title} className="text-3xl leading-tight" />
              <p className="mt-2 max-w-[60%] text-sm text-muted-foreground">{g.blurb}</p>
            </button>
          ))}
        </div>
      </section>

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
              <game.C players={players} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
