import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, HeartHandshake, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { PasscodeDialog } from "@/components/family/PasscodeDialog";
import { hashPasscode } from "@/hooks/use-sona-profile";
import { CARE_RULES, CRISIS_LINKS } from "@/lib/sona/care";
import { AGE_MODES, type AgeMode, type CareCondition } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Sona" },
      { name: "description", content: "Age modes, care profile and your Sona helper." },
      { property: "og:title", content: "Settings — Sona" },
      { property: "og:description", content: "Sprout, Bloom or Open, plus your care profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Settings />
    </AppShell>
  ),
});

function Settings() {
  const { profile, update } = useSona();
  const [name, setName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle ?? "");
  const s = profile.settings;
  const [pending, setPending] = useState<AgeMode | null>(null);
  const [code, setCode] = useState("");
  const [changingCode, setChangingCode] = useState(false);
  const locked = profile.ageMode === "sprout" && !!profile.passcodeHash;

  function pickAge(m: AgeMode) {
    if (m === profile.ageMode) return;
    if (locked) setPending(m);
    else update({ ageMode: m }, { immediate: true });
  }

  async function savePasscode() {
    if (!/^\d{4,8}$/.test(code)) {
      toast.error("Use 4 to 8 digits");
      return;
    }
    await update({ passcodeHash: await hashPasscode(profile.id, code) }, { immediate: true });
    setCode("");
    setChangingCode(false);
    toast.success("Parent passcode saved");
  }

  function toggleCare(c: CareCondition) {
    const next = profile.care.includes(c) ? profile.care.filter((x) => x !== c) : [...profile.care, c];
    update({ care: next }, { immediate: true });
  }

  return (
    <>
      <PageHeader eyebrow="Make it yours" title="Settings" sub="Changes save as you go." />

      <div className="space-y-10">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h2 className="heading-calm text-3xl">You</h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              update({ displayName: name.trim().slice(0, 40) || "friend", handle: handle.trim().replace(/^@/, "").slice(0, 30) || null }, { immediate: true });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="dn">Display name</Label>
              <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hd">Handle</Label>
              <Input id="hd" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="yourname" maxLength={30} className="rounded-full" />
            </div>
            <Button type="submit" variant="ink">
              Save
            </Button>
          </form>
        </section>

        <section>
          <h2 className="heading-calm text-3xl">Age mode</h2>
          <p className="subline">Sets the edition size and how firm the guardrails are.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {AGE_MODES.map((m) => {
              const on = profile.ageMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => pickAge(m.id)}
                  aria-pressed={on}
                  className={cn(
                    "relative rounded-[1.75rem] border p-5 text-left transition",
                    on ? "border-ink bg-ink text-ink-foreground shadow-float" : "border-border bg-card hover:border-foreground/40",
                  )}
                >
                  <p className="eyebrow opacity-70">{m.who}</p>
                  <p className="heading-calm mt-1 text-4xl">{m.label}</p>
                  <p className={cn("mt-2 text-sm", on ? "text-ink-foreground/75" : "text-muted-foreground")}>{m.blurb}</p>
                  {on && <Check className="absolute right-5 top-5 size-5 text-lime" />}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="heading-calm flex items-center gap-3 text-3xl">
            Care profile <HeartHandshake className="size-6 text-care" />
          </h2>
          <p className="subline max-w-2xl">
            Pick anything that applies. Sona immediately holds back that condition's triggers, sinks harmful content in ranking, and locks those topic floors so they can't be loosened. Only you can see this.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {CARE_RULES.map((r) => {
              const on = profile.care.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleCare(r.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-start gap-3 rounded-[1.5rem] border p-4 text-left transition",
                    on ? "border-care bg-care-soft" : "border-border bg-card hover:border-foreground/40",
                  )}
                >
                  <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border", on ? "border-care bg-care text-primary-foreground" : "border-input")}>
                    {on && <Check className="size-3" />}
                  </span>
                  <span>
                    <span className="font-medium">{r.label}</span>
                    <span className="block text-sm text-muted-foreground">{r.short}</span>
                    {on && <span className="mt-1 block text-xs text-care">{r.why}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-4">
            <SonaFigure look={profile.look} doodle={profile.doodle} pose={s.sonaEnabled ? "wave" : "rest"} className="w-16" />
            <div>
              <h2 className="heading-calm text-3xl">Your Sona</h2>
              <p className="subline text-sm">The little helper for rest nudges and check-ins.</p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-border">
            <Row id="sona-on" label="Sona helper" hint="Show your buddy across the app" checked={s.sonaEnabled} onChange={(v) => update({ settings: { sonaEnabled: v } })} />
            <Row
              id="sona-play"
              label="Let other Sonas interact"
              hint="Your circle's Sonas can visit you in the Zone and play minigames"
              checked={s.allowInteractions}
              onChange={(v) => update({ settings: { allowInteractions: v } })}
            />
            <Row id="checkins" label="15-minute check-ins" hint="Pause and ask how you feel every 15 minutes of use" checked={s.checkIns} onChange={(v) => update({ settings: { checkIns: v } })} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h2 className="heading-calm text-3xl">Content</h2>
          <p className="subline text-sm">How Sona treats AI-made and edited posts.</p>
          <div className="mt-2 divide-y divide-border">
            <Row id="ai-labels" label="Tag AI-generated & edited content" hint="Show a small tag on posts made with AI or with retouched photos" checked={s.aiLabels} onChange={(v) => update({ settings: { aiLabels: v } })} />
            <Row id="ai-block" label="Turn off all AI-generated content" hint="Hold back every post that was made with AI" checked={s.blockAI} onChange={(v) => update({ settings: { blockAI: v } })} />
            <Row id="acct" label="Accountability page" hint="Time limits, your month of check-ins and what you spend the most time on" checked={s.accountability} onChange={(v) => update({ settings: { accountability: v } })} />
          </div>
          {s.accountability && (
            <Button asChild variant="pill" size="sm" className="mt-2">
              <Link to="/accountability">Open Accountability</Link>
            </Button>
          )}
          <div className="mt-6 border-t border-border pt-5">
            <p className="font-medium">Trigger labels on people's posts</p>
            <p className="text-sm text-muted-foreground">Posters pick the labels. You pick how loudly they show — for every post.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Trigger label style">
              {(
                [
                  ["loud", "Loud", "Big and hard to miss. The post stays covered until you choose to show it."],
                  ["quiet", "Quiet", "A small line above the post. Visible, but it doesn't get in the way."],
                ] as const
              ).map(([id, label, blurb]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={s.labelStyle === id}
                  onClick={() => update({ settings: { labelStyle: id } })}
                  className={cn(
                    "rounded-[1.5rem] border p-4 text-left transition",
                    s.labelStyle === id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-background hover:border-foreground/40",
                  )}
                >
                  <p className={cn("heading-calm", id === "loud" ? "text-3xl" : "text-xl")}>{label}</p>
                  <p className={cn("mt-1 text-sm", s.labelStyle === id ? "text-ink-foreground/75" : "text-muted-foreground")}>{blurb}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h2 className="heading-calm flex items-center gap-3 text-3xl">
            Family Center <ShieldCheck className="size-6 text-care" />
          </h2>
          {profile.ageMode !== "sprout" ? (
            <p className="subline mt-1 text-sm">Family Center is for Sprout accounts (under 13). Switch to Sprout to link a parent.</p>
          ) : (
            <>
              <p className="subline mt-1 max-w-2xl text-sm">
                A parent sets a passcode to open Parent View: a protection check, weekly time and how many posts were hidden. Parents never see posts, messages or searches.
              </p>
              {!profile.passcodeHash || changingCode ? (
                <div className="mt-4 flex max-w-sm gap-2">
                  <Input
                    type="password"
                    inputMode="numeric"
                    aria-label="New parent passcode"
                    placeholder="4–8 digits"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    className="rounded-full"
                  />
                  <Button variant="ink" onClick={savePasscode}>
                    Set passcode
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="ink">
                    <Link to="/parent">Open Parent View</Link>
                  </Button>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-care-soft px-3 py-1.5 text-sm text-care">
                    <Check className="size-4" /> Parent linked · age mode locked
                  </span>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-[2rem] bg-care-soft p-6">
          <h2 className="heading-calm text-2xl text-care">If you need someone now</h2>
          <p className="mt-1 text-sm text-muted-foreground">In an immediate emergency, go to the nearest emergency room or call 911.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {CRISIS_LINKS.map((l) => (
              <li key={l.url}>
                <a href={l.url} target={l.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="underline underline-offset-4">
                  {l.label}
                </a>{" "}
                <span className="text-muted-foreground">— {l.note}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <PasscodeDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title="Leaving Sprout"
        description="A parent needs to enter the Family Center passcode to change the age mode."
        onVerified={() => {
          if (pending) update({ ageMode: pending }, { immediate: true });
          setPending(null);
        }}
      />
    </>
  );
}

function Row({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
