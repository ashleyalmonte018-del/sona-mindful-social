import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { Dial } from "@/components/vibe/Dial";
import { dialCaps, dialMix, effectiveDials } from "@/lib/sona/engine";
import { DIALS, VIBE_PRESETS, type DialId, type Dials } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vibe")({
  head: () => ({
    meta: [
      { title: "Vibe — Sona" },
      { name: "description", content: "Tune your algorithm with eight dials instead of guesswork." },
      { property: "og:title", content: "Vibe — Sona" },
      { property: "og:description", content: "Eight dials, four presets and a live mix bar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Vibe />
    </AppShell>
  ),
});

function Vibe() {
  const { profile, update } = useSona();
  const caps = dialCaps(profile.care);
  const dials = effectiveDials(profile.settings.vibe, profile.care);
  const mix = dialMix(dials);

  const setDial = (id: DialId, v: number) => update({ settings: { vibe: { ...profile.settings.vibe, [id]: v } } });
  const applyPreset = (d: Dials) => update({ settings: { vibe: effectiveDials(d, profile.care) } });
  const activePreset = VIBE_PRESETS.find((p) => DIALS.every((d) => effectiveDials(p.dials, profile.care)[d.id] === dials[d.id]));

  return (
    <>
      <PageHeader eyebrow="Your algorithm, out loud" title="Vibe" sub="Turn the dials. The feed ranks by what you'd call worth it — not by what keeps you staring.">
        <SonaFigure look={profile.look} doodle={profile.doodle} pose="dance" className="hidden w-20 md:block" />
      </PageHeader>

      <section>
        <p className="eyebrow text-muted-foreground">Starter presets</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {VIBE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.dials)}
              aria-pressed={activePreset?.id === p.id}
              className={cn(
                "rounded-[1.5rem] border p-4 text-left transition",
                activePreset?.id === p.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card hover:border-foreground/40",
              )}
            >
              <p className="heading-calm text-2xl">{p.label}</p>
              <p className={cn("subline text-sm", activePreset?.id === p.id && "text-ink-foreground/70")}>{p.blurb}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-muted-foreground">Live mix</p>
          <p className="text-xs text-muted-foreground">What your edition will lean toward</p>
        </div>
        <div className="mt-3 flex h-5 overflow-hidden rounded-full bg-secondary" role="img" aria-label="Mix of your dials">
          {mix.map((m) => (
            <div
              key={m.id}
              style={{ width: `${m.pct}%`, background: DIALS.find((d) => d.id === m.id)!.color }}
              className="h-full transition-all duration-300"
              title={`${DIALS.find((d) => d.id === m.id)!.label} ${Math.round(m.pct)}%`}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {mix.map((m) => {
            const d = DIALS.find((x) => x.id === m.id)!;
            return (
              <li key={m.id} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: d.color }} /> {d.label} {Math.round(m.pct)}%
              </li>
            );
          })}
        </ul>

        <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
          {DIALS.map((d) => (
            <div key={d.id} className="flex flex-col items-center">
              <Dial
                label={d.label}
                value={dials[d.id]}
                color={d.color}
                cap={caps[d.id]?.cap}
                capLabel={caps[d.id] ? `care · max ${caps[d.id]!.cap}` : undefined}
                onChange={(v) => setDial(d.id, v)}
              />
              <p className="subline mt-1 text-center text-xs">{d.hint}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
