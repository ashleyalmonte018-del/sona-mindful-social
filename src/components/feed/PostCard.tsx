import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Play, ScanText, Snowflake, Sparkles, Sprout } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { WhyDialog } from "@/components/feed/WhyDialog";
import type { Judged } from "@/lib/sona/engine";
import { summarizePost } from "@/lib/sona/summary.functions";
import { addCategorySeconds } from "@/lib/sona/usage";
import { CATEGORIES } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  lime: "bg-lime-soft",
  orange: "bg-prop-orange/20",
  purple: "bg-prop-purple/15",
  sky: "bg-doodle-blue/15",
  sand: "bg-prop-brown/20",
};

export function PostCard({
  judged,
  onSeen,
  rating,
  onRate,
  aiLabels = true,
}: {
  judged: Judged;
  onSeen: (id: string) => void;
  rating?: 1 | -1 | undefined;
  onRate: (v: 1 | -1) => void;
  aiLabels?: boolean | undefined;
}) {
  const { post, verdict } = judged;
  const [labelState, setLabelState] = useState<"summary" | "open" | "skipped">(verdict === "label" ? "summary" : "open");
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(verdict !== "soften");
  const [why, setWhy] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let since: number | null = null;
    const flush = () => {
      if (since !== null) addCategorySeconds(post.category, (Date.now() - since) / 1000);
      since = null;
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          onSeen(post.id);
          since = Date.now();
        } else flush();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      flush();
      io.disconnect();
    };
  }, [post.id, onSeen]);

  const cat = CATEGORIES.find((c) => c.id === post.category);

  return (
    <article ref={ref} className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft md:p-6">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-medium uppercase text-secondary-foreground">
          {post.author.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{post.author}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{post.handle} · {post.hoursAgo}h
          </p>
        </div>
        {judged.coolDown && (
          <span className="inline-flex items-center gap-1 rounded-full bg-doodle-blue/10 px-2.5 py-1 text-xs text-doodle-blue">
            <Snowflake className="size-3" /> cooling down
          </span>
        )}
        {aiLabels && post.ai && (
          <span className="inline-flex items-center gap-1 rounded-full bg-prop-purple/15 px-2.5 py-1 text-xs text-prop-purple">
            <Sparkles className="size-3" /> {post.ai === "generated" ? "AI-generated" : "Edited photo"}
          </span>
        )}
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{cat?.label}</span>
      </header>

      {labelState === "summary" ? (
        <LabelSummary
          judged={judged}
          onView={() => setLabelState("open")}
          onMeh={() => {
            onRate(-1);
            setLabelState("skipped");
          }}
          onWorth={() => {
            onRate(1);
            setLabelState("open");
          }}
        />
      ) : labelState === "skipped" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Skipped — marked meh.{" "}
          <button className="underline underline-offset-4" onClick={() => setLabelState("summary")}>
            Undo
          </button>
        </p>
      ) : (
      <>

      <div className="relative mt-4">
        <div className={cn("transition", !revealed && "pointer-events-none select-none blur-lg")} aria-hidden={!revealed}>
          <p className="text-lg leading-relaxed">{post.text}</p>
          {post.category === "reels" ? (
            <Reel judged={judged} />
          ) : (
            post.scene && (
              <div className={cn("mt-4 flex h-48 items-end justify-center overflow-hidden rounded-2xl", TONE[post.scene.tone])}>
                <SonaFigure pose={post.scene.pose} className="h-44" />
              </div>
            )
          )}
        </div>
        {!revealed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl text-center">
            <p className="eyebrow text-muted-foreground">Softened</p>
            <p className="mt-1 max-w-xs text-sm">Contains {judged.flags.join(", ").toLowerCase() || "intense content"}.</p>
            <Button variant="pill" size="sm" className="mt-3" onClick={() => setRevealed(true)}>
              <Eye /> Tap to view
            </Button>
          </div>
        )}
      </div>

      {post.offline && revealed && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime-soft px-3 py-1.5 text-sm text-lime-foreground">
          <Sprout className="size-4" /> Try it offline: {post.offline}
        </p>
      )}

      </>
      )}

      <footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="mr-1 text-xs text-muted-foreground">Worth your time?</span>
        <Button size="sm" variant={rating === 1 ? "ink" : "soft"} onClick={() => onRate(1)} aria-pressed={rating === 1}>
          Worth it
        </Button>
        <Button size="sm" variant={rating === -1 ? "ink" : "soft"} onClick={() => onRate(-1)} aria-pressed={rating === -1}>
          Meh
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => setWhy(true)}>
          Why this?
        </Button>
      </footer>
      <WhyDialog judged={judged} open={why} onOpenChange={setWhy} />
    </article>
  );
}

function LabelSummary({ judged, onView, onMeh, onWorth }: { judged: Judged; onView: () => void; onMeh: () => void; onWorth: () => void }) {
  const summarize = useServerFn(summarizePost);
  const q = useQuery({
    queryKey: ["summary", judged.post.id],
    queryFn: () => summarize({ data: { text: judged.post.text, flags: judged.flags } }),
    staleTime: Infinity,
    retry: false,
  });
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/60 p-5">
      <p className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <ScanText className="size-3.5" /> Label only · summary first
      </p>
      {q.isLoading ? (
        <div className="mt-3 space-y-2" aria-label="Writing a summary">
          <div className="h-3 w-11/12 animate-pulse rounded-full bg-border" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-border" />
        </div>
      ) : (
        <p className="mt-2 text-base">
          {q.data?.summary ?? `A post about ${judged.flags.join(", ").toLowerCase() || judged.post.subgenre.replace(/-/g, " ")}.`}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="ink" onClick={onView}>
          <Eye /> View post
        </Button>
        <Button size="sm" variant="soft" onClick={onWorth}>
          Worth it
        </Button>
        <Button size="sm" variant="soft" onClick={onMeh}>
          Meh — skip
        </Button>
      </div>
    </div>
  );
}

function Reel({ judged }: { judged: Judged }) {
  const [state, setState] = useState<"idle" | "playing" | "ended">("idle");
  useEffect(() => {
    if (state !== "playing") return;
    const t = window.setTimeout(() => setState("ended"), 10000);
    const pause = () => setState("idle");
    window.addEventListener("sona:pause", pause);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("sona:pause", pause);
    };
  }, [state]);
  const pose = judged.post.scene?.pose ?? "dance";
  return (
    <div className={cn("relative mt-4 flex aspect-[4/5] max-h-[28rem] w-full items-center justify-center overflow-hidden rounded-2xl sm:aspect-video", TONE[judged.post.scene?.tone ?? "purple"])}>
      <SonaFigure pose={state === "playing" ? pose : "stand"} className={cn("h-3/4", state === "playing" && "animate-hop")} />
      {state === "idle" && (
        <button onClick={() => setState("playing")} className="absolute inset-0 flex items-center justify-center" aria-label="Play reel">
          <span className="flex size-16 items-center justify-center rounded-full bg-ink text-ink-foreground shadow-float">
            <Play className="ml-1 size-6" />
          </span>
        </button>
      )}
      {state === "playing" && (
        <div className="absolute bottom-0 left-0 h-1 bg-ink/70" style={{ animation: "reel-progress 10s linear forwards", width: "100%" }} />
      )}
      {state === "ended" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 text-center backdrop-blur-sm">
          <p className="heading-calm text-2xl">That's the reel</p>
          <p className="subline mt-1 text-sm">Nothing plays next on its own — your call.</p>
          <Button variant="pill" size="sm" className="mt-3" onClick={() => setState("playing")}>
            Watch again
          </Button>
        </div>
      )}
      <style>{`@keyframes reel-progress { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); transform-origin: left; } }`}</style>
    </div>
  );
}

export function HeldLine({ judged, onShow }: { judged: Judged; onShow?: () => void }) {
  const [why, setWhy] = useState(false);
  const locked = judged.reasons.some((r) => r.kind === "care" || r.kind === "age");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-dashed border-border px-5 py-3 text-sm text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/50" />
      <span>
        1 post held back · {judged.flags.join(", ").toLowerCase() || "intense"}
      </span>
      <span className="ml-auto flex items-center gap-1">
        <button className="rounded-full px-2 py-0.5 hover:text-foreground" onClick={() => setWhy(true)}>
          Why?
        </button>
        {locked ? (
          <span className="rounded-full bg-care-soft px-2.5 py-0.5 text-xs text-care">locked by care</span>
        ) : (
          onShow && (
            <button className="rounded-full px-2 py-0.5 hover:text-foreground" onClick={onShow}>
              Show anyway
            </button>
          )
        )}
      </span>
      <WhyDialog judged={judged} open={why} onOpenChange={setWhy} />
    </div>
  );
}
