import { Link } from "@tanstack/react-router";
import { Music2 } from "lucide-react";

import { MoodDot } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { SAMPLE_MEMBERS, useCircleMembers } from "@/hooks/use-circle";
import { moodColor } from "@/lib/sona/types";

export function CirclePanel({ limit = 4 }: { limit?: number }) {
  const { profile } = useSona();
  const quiet = profile.settings.quietMode;
  const q = useCircleMembers();
  const real = q.data ?? [];
  const sample = q.isSuccess && real.length === 0;
  const members = (sample ? SAMPLE_MEMBERS : real).slice(0, limit);
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="heading-calm text-2xl">Circle</h2>
        <Link to="/circle" className="text-xs text-muted-foreground hover:text-foreground">
          See all
        </Link>
      </div>
      <p className="subline text-sm">A song and a mood. That's it.</p>
      {quiet ? (
        <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">Quiet mode is on — your circle is muted for now.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {members.map((f) => (
            <li key={f.id} className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-secondary">
                <SonaFigure look={f.look} pose="stand" noShadow className="-mb-3 h-12" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {f.name} {f.mood && <MoodDot color={moodColor(f.mood)} />}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  {f.quiet || !f.song ? (
                    "Resting quietly"
                  ) : (
                    <>
                      <Music2 className="size-3 shrink-0" /> {f.song}
                      {f.artist ? ` — ${f.artist}` : ""}
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!quiet && sample && <p className="mt-3 text-xs text-muted-foreground">No one here yet — when you follow each other, they'll show up here.</p>}
    </section>
  );
}
