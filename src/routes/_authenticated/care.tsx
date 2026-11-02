import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, HeartHandshake } from "lucide-react";
import { useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { BreathingPrompt } from "@/components/shell/BreathingPrompt";
import { MoodPicker } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { useJournal, useMoods, type JournalRow } from "@/hooks/use-sona-profile";
import { CARE_RULES } from "@/lib/sona/care";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/care")({
  head: () => ({
    meta: [
      { title: "Care — Sona" },
      { name: "description", content: "CBT reframing, mindfulness, journaling, research and real support links." },
      { property: "og:title", content: "Care — Sona" },
      { property: "og:description", content: "Small daily practices and real support, made for teens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Care />
    </AppShell>
  ),
});

const LIKERT = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
const PRACTICE_DAYS = 14;

const MINDFUL_LINKS = [
  { label: "UCLA Mindful — free guided meditations", url: "https://www.uclahealth.org/programs/marc/free-guided-meditations" },
  { label: "Yoga With Adriene — beginner yoga", url: "https://www.youtube.com/@yogawithadriene" },
  { label: "Insight Timer — free meditation library", url: "https://insighttimer.com/" },
];

const SUPPORT = [
  { label: "MHA — Finding therapy", url: "https://www.mhanational.org/finding-therapy" },
  { label: "NPR — How to find a therapist", url: "https://www.npr.org/sections/health-shots/2023/07/02/1185661348/start-therapy-find-therapist-how-to" },
  { label: "Zencare — therapists in New Jersey", url: "https://zencare.co/us/new-jersey/therapists" },
  { label: "MyWellbeing — low-fee options in NJ", url: "https://mywellbeing.com/low-fee-resources-new-jersey" },
];
const HOTLINES = [
  { label: "Call or text 988", url: "tel:988", note: "If you're unsure how serious it is" },
  { label: "988lifeline.org chat", url: "https://988lifeline.org/", note: "Chat 24/7" },
  { label: "NJ hotlines", url: "https://www.nj.gov/health/integratedhealth/hotlines/index.shtml", note: "State directory" },
  { label: "NJ 211 — mental health", url: "https://nj211.org/mental-health", note: "Local services" },
];

function days(entries: JournalRow[], kind: string) {
  return new Set(entries.filter((e) => e.kind === kind).map((e) => new Date(e.created_at).toDateString())).size;
}

function Care() {
  const { profile } = useSona();
  const { entries } = useJournal();

  return (
    <>
      <PageHeader eyebrow="Small things, every day" title="Care" sub="Practices from real therapy, 14 days at a time. Plus what's actually going on in your brain.">
        <SonaFigure look={profile.look} doodle={profile.doodle} pose="hug" className="hidden w-20 md:block" />
      </PageHeader>

      <Tabs defaultValue="reframe">
        <TabsList className="h-auto flex-wrap rounded-full bg-secondary p-1">
          <TabsTrigger value="reframe" className="rounded-full px-4 py-1.5">Reframe · CBT</TabsTrigger>
          <TabsTrigger value="mindful" className="rounded-full px-4 py-1.5">Mindful · MBCT</TabsTrigger>
          <TabsTrigger value="journal" className="rounded-full px-4 py-1.5">Journal & mood</TabsTrigger>
        </TabsList>

        <TabsContent value="reframe" className="mt-6">
          <Practice
            kind="reframe"
            title="Reframe it"
            about="Cognitive Behavioral Therapy notices unhelpful thought patterns and swaps them for realistic ones. Write something that went badly, then say it again — kinder and truer."
            entries={entries}
            likert="This activity changed how I actively think about a bad situation."
          >
            <ReframeForm />
          </Practice>
        </TabsContent>

        <TabsContent value="mindful" className="mt-6">
          <Practice
            kind="mbct"
            title="Be here"
            about="Mindfulness-Based Cognitive Therapy blends meditation with CBT to ease anxiety and low mood. Do one short session a day — meditation, yoga or mindful stretching."
            entries={entries}
            likert="This activity changed how I actively think about a bad situation."
          >
            <MindfulForm />
          </Practice>
        </TabsContent>

        <TabsContent value="journal" className="mt-6">
          <Practice
            kind="journal"
            title="Write it down"
            about="Journaling and mood tracking help you spot patterns. One line counts."
            entries={entries}
            likert="This activity changed how I actively think about a bad situation."
          >
            <JournalForm />
          </Practice>
        </TabsContent>
      </Tabs>

      <section className="mt-14">
        <h2 className="heading-calm text-4xl">Understand it</h2>
        <p className="subline">What research says about the conditions in your care profile options.</p>
        <Accordion type="multiple" className="mt-4 rounded-[2rem] border border-border bg-card px-6 shadow-soft">
          {CARE_RULES.map((r) => (
            <AccordionItem key={r.id} value={r.id}>
              <AccordionTrigger className="text-left">
                <span className="flex items-center gap-2">
                  {r.label}
                  {profile.care.includes(r.id) && <span className="rounded-full bg-care-soft px-2 py-0.5 text-xs text-care">in your profile</span>}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p><span className="eyebrow mr-2 text-muted-foreground">Brain</span>{r.research.neuro}</p>
                <p><span className="eyebrow mr-2 text-muted-foreground">Stressors</span>{r.research.origins}</p>
                {r.research.stats && <p><span className="eyebrow mr-2 text-muted-foreground">Stats</span>{r.research.stats}</p>}
                <ul className="flex flex-wrap gap-2">
                  {r.research.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-foreground/40">
                        {s.label} <ExternalLink className="size-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h2 className="heading-calm text-3xl">Talk to someone</h2>
          <p className="subline text-sm">Ways to find a real therapist, including low-fee options.</p>
          <ul className="mt-4 space-y-2">
            {SUPPORT.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-full border border-border px-4 py-2.5 text-sm hover:border-foreground/40">
                  {s.label} <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[2rem] bg-care-soft p-6">
          <h2 className="heading-calm flex items-center gap-2 text-3xl text-care">
            Right now <HeartHandshake className="size-6" />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Immediate emergency: go to the nearest ER or call 911.</p>
          <ul className="mt-4 space-y-2">
            {HOTLINES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target={s.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex items-center justify-between rounded-full bg-card/80 px-4 py-2.5 text-sm">
                  <span>{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function Practice({
  kind,
  title,
  about,
  entries,
  likert,
  children,
}: {
  kind: string;
  title: string;
  about: string;
  entries: JournalRow[];
  likert: string;
  children: React.ReactNode;
}) {
  const { add } = useJournal();
  const done = days(entries, kind);
  const rated = entries.find((e) => e.kind === `likert-${kind}`);
  const mine = entries.filter((e) => e.kind === kind).slice(0, 5);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
        <h2 className="heading-calm text-4xl">{title}</h2>
        <p className="subline mt-1">{about}</p>
        <div className="mt-6">{children}</div>
        {mine.length > 0 && (
          <ul className="mt-6 space-y-2 border-t border-border pt-4">
            {mine.map((e) => (
              <li key={e.id} className="rounded-2xl bg-secondary px-4 py-3 text-sm">
                {e.original && <p className="text-muted-foreground line-through decoration-muted-foreground/40">{e.original}</p>}
                {e.reframe && <p>{e.reframe}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
        <p className="eyebrow text-muted-foreground">Your 14 days</p>
        <p className="heading-calm mt-1 text-5xl">
          {Math.min(done, PRACTICE_DAYS)}
          <span className="text-2xl text-muted-foreground">/{PRACTICE_DAYS}</span>
        </p>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {Array.from({ length: PRACTICE_DAYS }, (_, i) => (
            <span key={i} className={cn("aspect-square rounded-full", i < done ? "bg-lime" : "bg-secondary")} />
          ))}
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm">"{likert}"</p>
          {rated ? (
            <p className="mt-2 text-sm text-muted-foreground">You answered: {LIKERT[(rated.rating ?? 3) - 1]}</p>
          ) : done >= PRACTICE_DAYS ? (
            <div className="mt-3 grid gap-1.5">
              {LIKERT.map((l, i) => (
                <Button key={l} size="sm" variant="soft" className="justify-start" onClick={() => add.mutate({ kind: `likert-${kind}`, rating: i + 1 })}>
                  {l}
                </Button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Unlocks after {PRACTICE_DAYS} days of practice.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function ReframeForm() {
  const { add } = useJournal();
  const [bad, setBad] = useState("");
  const [kind, setKind] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!bad.trim() || !kind.trim()) return;
        add.mutate({ kind: "reframe", original: bad.trim().slice(0, 500), reframe: kind.trim().slice(0, 500) }, { onSuccess: () => { setBad(""); setKind(""); } });
      }}
    >
      <label className="block text-sm">
        What went badly?
        <Textarea value={bad} onChange={(e) => setBad(e.target.value)} maxLength={500} placeholder="I bombed my presentation and everyone thinks I'm dumb." className="mt-1.5 rounded-2xl" />
      </label>
      <label className="block text-sm">
        Now say it kinder — and truer
        <Textarea value={kind} onChange={(e) => setKind(e.target.value)} maxLength={500} placeholder="I was nervous and stumbled, but I finished. Most people were thinking about their own slides." className="mt-1.5 rounded-2xl" />
      </label>
      <Button type="submit" variant="ink" disabled={add.isPending || !bad.trim() || !kind.trim()}>
        Save reframe
      </Button>
    </form>
  );
}

function MindfulForm() {
  const { add } = useJournal();
  const [breathing, setBreathing] = useState(false);
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {MINDFUL_LINKS.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-full border border-border px-4 py-2.5 text-sm hover:border-foreground/40">
              {l.label} <ExternalLink className="size-3.5 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
      {breathing ? (
        <BreathingPrompt seconds={30} onDone={() => { setBreathing(false); add.mutate({ kind: "mbct", reframe: "30-second breathing in Sona" }); }} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="lime" onClick={() => setBreathing(true)}>30-second breath here</Button>
          <Button variant="pill" onClick={() => add.mutate({ kind: "mbct", reframe: "Did a meditation / yoga session" })}>
            I did a session today
          </Button>
        </div>
      )}
    </div>
  );
}

function JournalForm() {
  const { add } = useJournal();
  const { log } = useMoods();
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string>();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        add.mutate({ kind: "journal", reframe: text.trim().slice(0, 1000) }, { onSuccess: () => setText("") });
      }}
    >
      <div>
        <p className="text-sm">Mood right now</p>
        <div className="mt-2">
          <MoodPicker
            size="sm"
            value={mood}
            onPick={(m) => {
              setMood(m);
              log.mutate({ mood: m, source: "journal" });
            }}
          />
        </div>
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="One line is enough…" className="min-h-28 rounded-2xl" />
      <Button type="submit" variant="ink" disabled={add.isPending || !text.trim()}>
        Save entry
      </Button>
    </form>
  );
}
