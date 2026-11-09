import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { MoodPicker } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { useMoods } from "@/hooks/use-sona-profile";
import { DAILY_GUIDE_MIN } from "@/lib/sona/usage";

const TIPS = [
  "Drink some water? I'll wait 💧",
  "Your feed ends on purpose. That's the point.",
  "Text someone you miss today.",
  "Shoulders down, jaw unclenched.",
];

/** The floating Sona buddy: daily check-ins and rest nudges. */
export function SonaHelper({ minutesToday, onRest }: { minutesToday: number; onRest: () => void }) {
  const { profile } = useSona();
  const { checkedInToday, log, isLoading } = useMoods();
  const [open, setOpen] = useState(false);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const needsRest = minutesToday >= DAILY_GUIDE_MIN;
  const needsCheckIn = !isLoading && !checkedInToday;

  useEffect(() => {
    if (sessionStorage.getItem("sona.helperShown")) return;
    if (needsCheckIn || needsRest) {
      setOpen(true);
      sessionStorage.setItem("sona.helperShown", "1");
    }
  }, [needsCheckIn, needsRest]);

  const pose = needsRest ? "rest" : needsCheckIn ? "wave" : "stand";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 rounded-3xl border border-border bg-popover p-4 text-sm shadow-float animate-pop">
          <div className="flex items-start justify-between gap-2">
            <p className="eyebrow text-muted-foreground">{profile.look.name || "Your Sona"}</p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          {needsRest ? (
            <>
              <p className="mt-2">
                You've been here {minutesToday} minutes today. Around {DAILY_GUIDE_MIN} a day is a healthy baseline — time for a rest?
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="lime" onClick={() => { setOpen(false); onRest(); }}>Take a breather</Button>
                <Button size="sm" variant="soft" onClick={() => setOpen(false)}>Later</Button>
              </div>
            </>
          ) : needsCheckIn ? (
            <>
              <p className="mt-2">Hey {profile.displayName}! Daily check-in — how are you, really?</p>
              <div className="mt-3">
                <MoodPicker
                  size="sm"
                  onPick={(m) => {
                    log.mutate({ mood: m, source: "daily" });
                    setOpen(false);
                  }}
                />
              </div>
            </>
          ) : (
            <p className="mt-2">{tip}</p>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group relative rounded-full"
        aria-label={open ? "Hide your Sona" : "Talk to your Sona"}
      >
        {(needsCheckIn || needsRest) && !open && <span className="absolute right-1 top-1 size-3 rounded-full border-2 border-background bg-lime" />}
        <SonaFigure look={profile.look} doodle={profile.doodle} pose={pose} className="w-16 animate-bob transition group-hover:scale-105" />
      </button>
    </div>
  );
}
