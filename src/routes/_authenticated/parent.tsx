import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, EyeOff, Lock, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PasscodeForm } from "@/components/family/PasscodeDialog";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { useUsageDays } from "@/hooks/use-sona-profile";
import { protectionChecks } from "@/lib/sona/family";
import { POSTS } from "@/lib/sona/posts";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({
    meta: [
      { title: "Parent View — Sona" },
      { name: "description", content: "Passcode-protected protection check and weekly summary for Sapling accounts." },
      { property: "og:title", content: "Parent View — Sona" },
      { property: "og:description", content: "See that protections work — without seeing your child's posts or messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Parent />
    </AppShell>
  ),
});

function Parent() {
  const { profile } = useSona();
  const [unlocked, setUnlocked] = useState(false);

  if (profile.ageMode !== "sapling" || !profile.passcodeHash) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <SonaFigure pose="think" className="mx-auto w-24" />
        <h1 className="heading-calm mt-4 text-4xl">No parent linked yet</h1>
        <p className="subline mt-2">Parent View works for Sapling accounts with a Family Center passcode.</p>
        <Button asChild variant="ink" className="mt-6">
          <Link to="/settings">Go to Family Center</Link>
        </Button>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-sm py-12 text-center">
        <SonaFigure pose="envelope" className="mx-auto w-24" />
        <p className="eyebrow mt-6 text-muted-foreground">Family Center</p>
        <h1 className="heading-calm mt-2 text-5xl">Parent View</h1>
        <p className="subline mt-2">Enter the parent passcode to continue.</p>
        <div className="mt-6">
          <PasscodeForm onVerified={() => setUnlocked(true)} cta="Open Parent View" />
        </div>
      </div>
    );
  }

  return <ParentDashboard onLock={() => setUnlocked(false)} />;
}

function ParentDashboard({ onLock }: { onLock: () => void }) {
  const { profile, update } = useSona();
  const usage = useUsageDays(7);
  const checks = useMemo(() => protectionChecks(POSTS, profile), [profile]);
  const allGood = checks.every((c) => c.ok);
  const days = lastSevenDays(usage.data ?? []);
  const totalMin = Math.round(days.reduce((s, d) => s + d.seconds, 0) / 60);
  const hidden = days.reduce((s, d) => s + d.hidden, 0);
  const maxMin = Math.max(30, ...days.map((d) => d.seconds / 60));

  return (
    <>
      <PageHeader eyebrow="Family Center" title="Parent View" sub={`Watching over ${profile.displayName}'s Sapling account — protections, not private life.`}>
        <Button variant="pill" size="sm" onClick={onLock}>
          <Lock /> Lock
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <ShieldCheck className={allGood ? "size-8 text-care" : "size-8 text-destructive"} />
            <div>
              <h2 className="heading-calm text-3xl">Protection check</h2>
              <p className="subline text-sm">{allGood ? "Everything restricted is being blocked." : "Something needs attention."}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-care" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
                <span>
                  <span className="font-medium">{c.label}</span>
                  <span className="block text-muted-foreground">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border px-4 py-3">
            <Label htmlFor="p-ai">Block all AI-generated content</Label>
            <Switch id="p-ai" checked={profile.settings.blockAI} onCheckedChange={(v) => update({ settings: { blockAI: v } })} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h2 className="heading-calm text-3xl">This week</h2>
          <p className="subline text-sm">Time on Sona and how many posts were kept out.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-secondary p-4">
              <p className="heading-calm text-5xl">{totalMin}</p>
              <p className="text-xs text-muted-foreground">minutes this week</p>
            </div>
            <div className="rounded-2xl bg-secondary p-4">
              <p className="heading-calm text-5xl">{hidden}</p>
              <p className="text-xs text-muted-foreground">posts hidden</p>
            </div>
          </div>
          <div className="mt-6 flex h-36 items-end gap-2" role="img" aria-label="Minutes per day this week">
            {days.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[0.65rem] text-muted-foreground">{Math.round(d.seconds / 60)}</span>
                <div className="w-full rounded-t-xl bg-lime" style={{ height: `${Math.max(4, (d.seconds / 60 / maxMin) * 100)}%` }} />
                <span className="text-[0.65rem] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Time is counted while Sona is open on screen.</p>
        </section>
      </div>

      <section className="mt-6 flex items-start gap-4 rounded-[2rem] bg-care-soft p-6">
        <EyeOff className="mt-1 size-6 shrink-0 text-care" />
        <div>
          <h2 className="heading-calm text-2xl text-care">Privacy, built in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Parent View never shows what {profile.displayName} saw, posted, messaged or searched — only that the guardrails are working and how much time was spent. Trust grows both ways.
          </p>
        </div>
      </section>
    </>
  );
}

function lastSevenDays(rows: { day: string; seconds: number; hidden_count: number }[]) {
  const out: { day: string; label: string; seconds: number; hidden: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const row = rows.find((r) => r.day === iso);
    out.push({ day: iso, label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), seconds: row?.seconds ?? 0, hidden: row?.hidden_count ?? 0 });
  }
  return out;
}
