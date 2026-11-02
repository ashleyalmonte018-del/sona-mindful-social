import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, Music2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shell/AppShell";
import { MoodDot } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { useJournal, useMoods } from "@/hooks/use-sona-profile";
import { careRule } from "@/lib/sona/care";
import { AGE_MODES, MOODS, moodColor, moodLabel } from "@/lib/sona/types";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Sona" },
      { name: "description", content: "Your Sona, your moods and your progress." },
      { property: "og:title", content: "Profile — Sona" },
      { property: "og:description", content: "Your Sona, your moods and your progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Profile />
    </AppShell>
  ),
});

function Profile() {
  const { profile } = useSona();
  const { moods } = useMoods();
  const { entries } = useJournal();
  const age = AGE_MODES.find((a) => a.id === profile.ageMode)!;
  const recent = moods.slice(0, 21).reverse();
  const counts = MOODS.map((m) => ({ ...m, n: moods.filter((x) => x.mood === m.id).length })).filter((m) => m.n > 0);
  const activityDays = new Set(entries.map((e) => new Date(e.created_at).toDateString())).size;

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 text-center shadow-soft">
        <div className="absolute inset-0 bg-glow opacity-60" />
        <div className="relative">
          <SonaFigure look={profile.look} doodle={profile.doodle} className="mx-auto w-40" />
          <h1 className="heading-calm mt-4 text-5xl">{profile.displayName}</h1>
          <p className="subline">{profile.handle ? `@${profile.handle}` : profile.look.name}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <span className="rounded-full bg-ink px-3 py-1 text-ink-foreground">{age.label} mode</span>
            {profile.care.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-care-soft px-3 py-1 text-care">
                <HeartHandshake className="size-3" /> {careRule(c).label}
              </span>
            ))}
          </div>
          {!profile.settings.quietMode && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Music2 className="size-3.5" /> {profile.settings.share.song} — {profile.settings.share.artist}
              <MoodDot color={moodColor(profile.settings.share.mood)} />
            </p>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="ink" size="sm">
              <Link to="/studio">Edit my Sona</Link>
            </Button>
            <Button asChild variant="pill" size="sm">
              <Link to="/settings">Settings</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <div className="flex items-baseline justify-between">
            <h2 className="heading-calm text-3xl">Mood trail</h2>
            <span className="text-xs text-muted-foreground">{moods.length} check-ins</span>
          </div>
          <p className="subline text-sm">Every dot is a moment you noticed how you felt.</p>
          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No check-ins yet — your Sona will ask soon.</p>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap gap-2">
                {recent.map((m) => (
                  <span
                    key={m.id}
                    title={`${moodLabel(m.mood)} · ${new Date(m.created_at).toLocaleString()}`}
                    className="size-6 rounded-full border-2 border-card shadow-soft"
                    style={{ background: moodColor(m.mood) }}
                  />
                ))}
              </div>
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {counts.map((c) => (
                  <li key={c.id} className="flex items-center gap-1.5">
                    <MoodDot color={c.color} /> {c.label} × {c.n}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard n={moods.length} label="check-ins" />
          <StatCard n={entries.length} label="care activities" />
          <StatCard n={activityDays} label="of 14 practice days" />
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <div>
            <h2 className="heading-calm text-2xl">14-day practice</h2>
            <p className="subline text-sm">Reframing, mindfulness and journaling live in Care.</p>
          </div>
          <Button asChild variant="pill">
            <Link to="/care">Open Care</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

function StatCard({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-card p-5 text-center shadow-soft">
      <p className="heading-calm text-5xl">{n}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
