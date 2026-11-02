import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { BreathingPrompt } from "@/components/shell/BreathingPrompt";
import { MoodPicker } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { useMoods } from "@/hooks/use-sona-profile";
import type { MoodId } from "@/lib/sona/types";

const HEAVY: MoodId[] = ["anxious", "sad", "overwhelmed", "tired"];

/** The 15-minute passive check-in: dims everything and asks how you feel. */
export function CheckInOverlay({ onClose }: { onClose: () => void }) {
  const { profile } = useSona();
  const { log } = useMoods();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [breathing, setBreathing] = useState(false);

  function pick(m: MoodId) {
    setMood(m);
    log.mutate({ mood: m, source: "passive" });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-6 backdrop-blur-md animate-in fade-in" role="dialog" aria-modal="true" aria-label="Check-in">
      <div className="w-full max-w-lg text-center">
        {profile.settings.sonaEnabled && <SonaFigure look={profile.look} doodle={profile.doodle} pose={mood ? (HEAVY.includes(mood) ? "hug" : "cheer") : "think"} className="mx-auto w-28" />}
        {breathing ? (
          <BreathingPrompt seconds={8} onDone={() => setBreathing(false)} className="mt-6" />
        ) : !mood ? (
          <>
            <p className="eyebrow mt-6 text-muted-foreground">15-minute check-in</p>
            <h2 className="heading-calm mt-2 text-4xl md:text-5xl">How do you feel right now?</h2>
            <p className="subline mt-2">Everything's paused. No wrong answers.</p>
            <div className="mt-6 flex justify-center">
              <MoodPicker onPick={pick} />
            </div>
            <button className="mt-6 text-sm text-muted-foreground underline underline-offset-4" onClick={onClose}>
              Skip this time
            </button>
          </>
        ) : HEAVY.includes(mood) ? (
          <>
            <h2 className="heading-calm mt-6 text-4xl">Thanks for telling me</h2>
            <p className="subline mt-2">Maybe step away for a bit? A breath or a short walk can reset things.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="lime" onClick={() => setBreathing(true)}>Breathe with me</Button>
              <Button asChild variant="pill" onClick={onClose}>
                <Link to="/care">Open Care</Link>
              </Button>
              <Button variant="soft" onClick={onClose}>Keep going</Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              In crisis? Call or text <a className="underline" href="tel:988">988</a> or go to <a className="underline" href="https://988lifeline.org/" target="_blank" rel="noreferrer">988lifeline.org</a>.
            </p>
          </>
        ) : (
          <>
            <h2 className="heading-calm mt-6 text-4xl">Love that</h2>
            <p className="subline mt-2">Want to keep going, or take that energy offline?</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="ink" onClick={onClose}>Keep going</Button>
              <Button variant="pill" onClick={onClose}>I'm done for now</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
