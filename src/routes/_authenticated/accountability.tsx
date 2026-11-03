import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { MoodDot } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { useMoods, useUsageDays } from "@/hooks/use-sona-profile";
import { CATEGORIES, moodColor } from "@/lib/sona/types";

export const Route = createFileRoute("/_authenticated/accountability")({
  head: () => ({
    meta: [
      { title: "Accountability — Sona" },
      { name: "description", content: "Set time limits, see your time and check-ins, and ask for help." },
      { property: "og:title", content: "Accountability — Sona" },
      { property: "og:description", content: "Your time, your check-ins, your call." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Accountability />
    </AppShell>
  ),
});

function Accountability() {
  const { profile, update } = useSona();
  const usage = useUsageDays(31);
  const { moods } = useMoods();
  const rows = usage.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayMin = Math.round((rows.find((r) => r.day === today)?.seconds ?? 0) / 60);
  const weekMin = Math.round(rows.slice(-7).reduce((s, r) => s + r.seconds, 0) / 60);
  const cats: Record<string, number> = {};
  rows.forEach((r) => Object.entries(r.category_seconds ?? {}).forEach(([k, v]) => (cats[k] = (cats[k] ?? 0) + v)));
  const catTotal = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
  const month = moods.filter((m) => Date.now() - new Date(m.created_at).getTime() < 31 * 86400000);

  return (
    <>
      <PageHeader eyebrow="Your time, your call" title="Accountability" sub="Limits you set for yourself, and an honest look back." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h2 className="heading-calm text-3xl">Daily limit</h2>
          <p className="subline text-sm">{profile.settings.timeLimit} minutes a day · around 30 is a healthy baseline</p>
          <Slider
            className="mt-5"
            value={[profile.settings.timeLimit]}
            min={15}
            max={180}
            step={15}
            onValueChange={([v]) => update({ settings: { timeLimit: v ?? 45 } })}
            aria-label="Daily time limit in minutes"
          />
          <div className="mt-6 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-secondary p-4">
              <p className="heading-calm text-5xl">{todayMin}</p>
              <p className="text-xs text-muted-foreground">minutes today</p>
            </div>
            <div className="rounded-2xl bg-secondary p-4">
              <p className="heading-calm text-5xl">{weekMin}</p>
              <p className="text-xs text-muted-foreground">minutes this week</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h2 className="heading-calm text-3xl">Most time on</h2>
          <p className="subline text-sm">Which feed buckets held your attention this month</p>
          <ul className="mt-5 space-y-3">
            {CATEGORIES.map((c) => {
              const pct = Math.round(((cats[c.id] ?? 0) / catTotal) * 100);
              return (
                <li key={c.id}>
                  <div className="flex justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-ink" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h2 className="heading-calm text-3xl">This month's check-ins</h2>
          <p className="subline text-sm">{month.length} moments you noticed how you felt</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {month.length === 0 && <p className="text-sm text-muted-foreground">No check-ins yet.</p>}
            {month
              .slice()
              .reverse()
              .map((m) => (
                <MoodDot key={m.id} color={moodColor(m.mood)} className="size-5" />
              ))}
          </div>
        </section>

        <section className="rounded-[2rem] bg-care-soft p-6">
          <h2 className="heading-calm text-3xl text-care">Ask for help</h2>
          <p className="mt-1 text-sm text-muted-foreground">Reaching out is a strong move. Pick whatever feels easiest.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="ink"><a href="sms:988">Text 988</a></Button>
            <Button asChild variant="pill"><a href="tel:988">Call 988</a></Button>
            <Button asChild variant="pill"><a href="https://988lifeline.org/" target="_blank" rel="noreferrer">Chat online</a></Button>
            <Button asChild variant="soft"><Link to="/care">Find a therapist</Link></Button>
          </div>
        </section>
      </div>
    </>
  );
}
