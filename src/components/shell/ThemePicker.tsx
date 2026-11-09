import { Check, Moon, Palette, Sun } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSona } from "@/components/shell/SonaContext";
import { customThemeVars, THEME_PRESETS, type ThemeChoice } from "@/lib/sona/theme";
import { cn } from "@/lib/utils";

/** Settings section: gradient preset themes, a custom colour, and light/dark mode. */
export function ThemePicker() {
  const { profile, update } = useSona();
  const theme = profile.settings.theme;
  const dark = theme.mode === "dark";
  const set = (patch: Partial<ThemeChoice>) => update({ settings: { theme: { ...theme, ...patch } } });
  const custom = customThemeVars(theme.custom);

  return (
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
      <h2 className="heading-calm flex items-center gap-3 text-3xl">
        Look &amp; feel <Palette className="size-6 text-muted-foreground" />
      </h2>
      <p className="subline text-sm">Pick the colours Sona wears. Only you see your theme.</p>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-[1.5rem] bg-secondary px-5 py-4">
        <div className="flex items-center gap-3">
          {dark ? <Moon className="size-5 text-lime" /> : <Sun className="size-5 text-muted-foreground" />}
          <div>
            <Label htmlFor="dark-mode">Dark mode</Label>
            <p className="text-sm text-muted-foreground">Nightfall — deep teal-navy with a warm amber glow.</p>
          </div>
        </div>
        <Switch id="dark-mode" checked={dark} onCheckedChange={(v) => set({ mode: v ? "dark" : "light" })} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="radiogroup" aria-label="Theme colour">
        {THEME_PRESETS.map((p) => {
          const on = theme.preset === p.id;
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={on}
              onClick={() => set({ preset: p.id })}
              className={cn(
                "relative rounded-[1.5rem] border p-3 text-left transition",
                on ? "border-ink ring-2 ring-ink/20" : "border-border hover:border-foreground/40",
              )}
            >
              {/* Swatch colours are preview data for each preset. */}
              <span
                className="block h-16 rounded-2xl border border-border/60"
                style={{
                  background: `radial-gradient(circle at 25% 20%, ${p.swatch[0]}, transparent 65%), radial-gradient(circle at 85% 30%, ${p.swatch[1]}, transparent 60%), ${p.swatch[2]}`,
                }}
              />
              <span className="mt-2 block text-sm font-medium">{p.label}</span>
              <span className="block text-xs text-muted-foreground">{p.blurb}</span>
              {on && <Check className="absolute right-4 top-4 size-4 text-foreground" />}
            </button>
          );
        })}

        <div
          role="radio"
          aria-checked={theme.preset === "custom"}
          tabIndex={0}
          onClick={() => set({ preset: "custom" })}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && set({ preset: "custom" })}
          className={cn(
            "relative cursor-pointer rounded-[1.5rem] border p-3 text-left transition",
            theme.preset === "custom" ? "border-ink ring-2 ring-ink/20" : "border-border hover:border-foreground/40",
          )}
        >
          <label className="relative block h-16 cursor-pointer overflow-hidden rounded-2xl border border-border/60">
            <span
              className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 25% 20%, ${custom["--glow-1"]}, transparent 65%), radial-gradient(circle at 85% 30%, ${custom["--glow-2"]}, transparent 60%), ${custom["--background"]}` }}
            />
            <input
              type="color"
              aria-label="Pick your own theme colour"
              value={theme.custom}
              onChange={(e) => set({ preset: "custom", custom: e.target.value })}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
          <span className="mt-2 block text-sm font-medium">Your colour</span>
          <span className="block text-xs text-muted-foreground">Tap the swatch to choose</span>
          {theme.preset === "custom" && <Check className="absolute right-4 top-4 size-4 text-foreground" />}
        </div>
      </div>
      {dark && <p className="mt-3 text-xs text-muted-foreground">Dark mode always uses Nightfall. Your theme colour comes back when you switch to light.</p>}
    </section>
  );
}
