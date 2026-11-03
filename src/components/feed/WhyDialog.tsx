import { HeartHandshake, Info } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CRISIS_LINKS } from "@/lib/sona/care";
import type { Judged, ReasonKind } from "@/lib/sona/engine";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ReasonKind, string> = {
  topic: "Your curate setting",
  guard: "Guard level",
  care: "Care profile",
  age: "Age mode",
  cooldown: "Cool-down",
  vibe: "Your vibe dials",
  rating: "Your ratings",
  sunk: "Care ranking",
  diversity: "Variety cap",
  quality: "Time well spent",
  ai: "AI content",
  boost: "Your topics & hashtags",
};

export function WhyDialog({ judged, open, onOpenChange }: { judged: Judged; open: boolean; onOpenChange: (o: boolean) => void }) {
  const verdict =
    judged.verdict === "hold" ? "Held back" : judged.verdict === "soften" ? "Softened" : judged.verdict === "label" ? "Label only" : "Let through";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <p className="eyebrow text-muted-foreground">Why this?</p>
          <DialogTitle className="heading-calm text-3xl">{verdict}</DialogTitle>
          <DialogDescription className="subline">
            A post by @{judged.post.handle}. Here's every rule that touched it — nothing hidden.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {judged.reasons.map((r, i) => (
            <li
              key={i}
              className={cn(
                "rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm",
                (r.kind === "care" || r.kind === "sunk") && "border-care/40 bg-care-soft",
              )}
            >
              <p className="eyebrow text-[0.65rem] text-muted-foreground">{KIND_LABEL[r.kind]}</p>
              <p className="mt-0.5">{r.text}</p>
            </li>
          ))}
        </ul>
        {judged.careFlag && (
          <div className="rounded-2xl bg-care-soft p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-care">
              <HeartHandshake className="size-4" /> Care support
            </p>
            <p className="mt-1 text-muted-foreground">If something here hit close to home, you don't have to handle it alone.</p>
            <ul className="mt-2 space-y-1">
              {CRISIS_LINKS.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target={l.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="underline underline-offset-4">
                    {l.label}
                  </a>{" "}
                  <span className="text-muted-foreground">— {l.note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" /> Likes and views are hidden on Sona for everyone.
        </p>
      </DialogContent>
    </Dialog>
  );
}
