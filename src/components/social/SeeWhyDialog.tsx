import { Check, HeartHandshake, Info, Minus } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CRISIS_LINKS } from "@/lib/sona/care";
import { CRISIS_LABELS, DISCLOSURES, triggerLabel, type LabelStyle, type UserPost } from "@/lib/sona/social";
import { cn } from "@/lib/utils";

/** Static "See why" bubble: exactly what the poster disclosed. Nothing is guessed or generated. */
export function SeeWhyDialog({
  post,
  author,
  labelStyle,
  open,
  onOpenChange,
}: {
  post: UserPost;
  author: string;
  labelStyle: LabelStyle;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const crisis = post.labels.some((l) => CRISIS_LABELS.includes(l));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <p className="eyebrow text-muted-foreground">See why</p>
          <DialogTitle className="heading-calm text-3xl">What {author} disclosed</DialogTitle>
          <DialogDescription className="subline">Everything below was chosen by the poster when they shared this — word for word.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {DISCLOSURES.map((d) => {
            const yes = post.disclosures[d.id];
            return (
              <li key={d.id} className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm">
                <span>{d.label}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs", yes ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground")}>
                  {yes ? <Check className="size-3" /> : <Minus className="size-3" />} {yes ? "Yes" : "No"}
                </span>
              </li>
            );
          })}
          {post.note && (
            <li className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm">
              <p className="eyebrow text-[0.65rem] text-muted-foreground">In their words</p>
              <p className="mt-0.5">{post.note}</p>
            </li>
          )}
          <li className="rounded-2xl border border-care/40 bg-care-soft px-4 py-3 text-sm">
            <p className="eyebrow text-[0.65rem] text-muted-foreground">Trigger labels</p>
            {post.labels.length === 0 ? (
              <p className="mt-0.5 text-muted-foreground">The poster didn't mark anything as triggering.</p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {post.labels.map((l) => (
                  <li key={l} className="rounded-full bg-care px-2.5 py-0.5 text-xs text-primary-foreground">
                    {triggerLabel(l)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
        {crisis && (
          <div className="rounded-2xl bg-care-soft p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-care">
              <HeartHandshake className="size-4" /> Care support
            </p>
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
          <Info className="size-3.5" /> You see labels {labelStyle === "loud" ? "Loud" : "Quiet"}. Change it in Settings.
        </p>
      </DialogContent>
    </Dialog>
  );
}
