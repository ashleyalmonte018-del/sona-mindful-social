import { cn } from "@/lib/utils";
import { MOODS, type MoodId } from "@/lib/sona/types";

export function MoodDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ background: color }} />;
}

export function MoodPicker({
  value,
  onPick,
  size = "md",
}: {
  value?: string | undefined;
  onPick: (m: MoodId) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPick(m.id)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border bg-card/70 text-foreground transition hover:-translate-y-0.5 hover:border-foreground/40",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
            value === m.id && "border-foreground bg-card shadow-soft",
          )}
          aria-pressed={value === m.id}
        >
          <MoodDot color={m.color} />
          {m.label}
        </button>
      ))}
    </div>
  );
}
