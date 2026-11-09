import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** A 5-second structural breath. Calls onDone when the breath completes. */
export function BreathingPrompt({ seconds = 5, onDone, className }: { seconds?: number; onDone: () => void; className?: string }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, onDone]);
  const phase = left > seconds / 2 ? "Breathe in…" : "…and out";
  return (
    <div className={cn("flex flex-col items-center text-center", className)} role="status" aria-live="polite">
      <div className="relative flex size-40 items-center justify-center">
        <div className="absolute inset-0 animate-breathe rounded-full bg-lime/60" />
        <div className="absolute inset-6 rounded-full bg-card/70" />
        <span className="heading-calm relative text-5xl">{Math.max(left, 0)}</span>
      </div>
      <p className="subline mt-5 text-lg">{phase}</p>
    </div>
  );
}
