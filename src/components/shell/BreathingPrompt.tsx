import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** A timed structural breath. Calls onDone exactly when the requested duration ends. */
export function BreathingPrompt({ seconds = 5, onDone, className }: { seconds?: number; onDone: () => void; className?: string }) {
  const [left, setLeft] = useState(seconds);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    setLeft(seconds);
    const tick = window.setInterval(() => setLeft((current) => Math.max(0, current - 1)), 1000);
    const done = window.setTimeout(() => {
      window.clearInterval(tick);
      setLeft(0);
      onDoneRef.current();
    }, seconds * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [seconds]);
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
