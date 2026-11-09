// Site colour themes. Pure helpers (no DOM) plus a small DOM applier used by the shell and the
// pre-hydration script in __root, so the chosen theme shows before React loads.

export type ThemePreset = "green" | "lavender" | "dusk" | "cream" | "custom";
export type ColorMode = "light" | "dark";

export interface ThemeChoice {
  preset: ThemePreset;
  custom: string;
  mode: ColorMode;
}

/** Preview swatches are data for the picker only; the real palettes live in styles.css. */
export const THEME_PRESETS: { id: Exclude<ThemePreset, "custom">; label: string; blurb: string; swatch: [string, string, string] }[] = [
  { id: "green", label: "Green glow", blurb: "The original lime tint", swatch: ["#d7f75b", "#9fe3c9", "#f4f5ef"] },
  { id: "lavender", label: "Lavender", blurb: "Lilac into silk pink", swatch: ["#c9b2ec", "#f3bfd6", "#f6f2fa"] },
  { id: "dusk", label: "Dusk blue", blurb: "Soft blue into peach", swatch: ["#9fb6ea", "#f6c9a8", "#f1f4fa"] },
  { id: "cream", label: "Warm cream", blurb: "Honey into rose sand", swatch: ["#f2cf86", "#eeb29c", "#faf5ea"] },
];

export const DEFAULT_THEME: ThemeChoice = { preset: "green", custom: "#7fd1b9", mode: "light" };
export const THEME_STORAGE_KEY = "sona-theme";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function normalizeTheme(raw: unknown): ThemeChoice {
  const t = (raw && typeof raw === "object" ? raw : {}) as Partial<ThemeChoice>;
  const presets: ThemePreset[] = ["green", "lavender", "dusk", "cream", "custom"];
  return {
    preset: presets.includes(t.preset as ThemePreset) ? (t.preset as ThemePreset) : DEFAULT_THEME.preset,
    custom: typeof t.custom === "string" && HEX.test(t.custom) ? t.custom.toLowerCase() : DEFAULT_THEME.custom,
    mode: t.mode === "dark" ? "dark" : "light",
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Same colour with its hue turned by `deg`, for the second stop of a custom gradient. */
export function rotateHue(hex: string, deg: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (((h * 60 + deg) % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}

export const CUSTOM_VAR_NAMES = [
  "--lime",
  "--lime-soft",
  "--lime-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--background",
  "--card",
  "--popover",
  "--glow-1",
  "--glow-2",
] as const;

/** CSS variables for a custom colour in light mode. Text on the colour flips dark/light for contrast. */
export function customThemeVars(hex: string): Record<(typeof CUSTOM_VAR_NAMES)[number], string> {
  const c = HEX.test(hex) ? hex : DEFAULT_THEME.custom;
  const darkText = luminance(c) > 0.4;
  return {
    "--lime": c,
    "--lime-soft": `color-mix(in oklab, ${c} 40%, white)`,
    "--lime-foreground": darkText ? "oklch(0.2 0.02 260)" : "oklch(0.985 0.003 100)",
    "--accent": `color-mix(in oklab, ${c} 22%, white)`,
    "--accent-foreground": "oklch(0.2 0.02 260)",
    "--ring": c,
    "--background": `color-mix(in oklab, ${c} 6%, oklch(0.968 0.003 100))`,
    "--card": `color-mix(in oklab, ${c} 2.5%, oklch(0.988 0.002 100))`,
    "--popover": `color-mix(in oklab, ${c} 2%, oklch(0.99 0.002 100))`,
    "--glow-1": c,
    "--glow-2": rotateHue(c, 45),
  };
}

/** Apply a theme to <html>. Dark mode always uses the Nightfall palette, so custom colours only apply in light mode. */
export function applyTheme(t: ThemeChoice, root: HTMLElement = document.documentElement) {
  root.classList.toggle("dark", t.mode === "dark");
  root.style.colorScheme = t.mode;
  root.dataset["theme"] = t.preset;
  const custom = t.preset === "custom" && t.mode === "light" ? customThemeVars(t.custom) : null;
  for (const name of CUSTOM_VAR_NAMES) {
    if (custom) root.style.setProperty(name, custom[name]);
    else root.style.removeProperty(name);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(t));
  } catch {
    // storage may be blocked; the theme still applies for this visit
  }
}

/**
 * Inline, dependency-free version of applyTheme for the <head> script so the saved theme
 * paints before hydration. Keep in sync with applyTheme / customThemeVars.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"null");if(!t)return;var r=document.documentElement;if(t.mode==="dark"){r.classList.add("dark");r.style.colorScheme="dark";}if(typeof t.preset==="string")r.dataset.theme=t.preset;}catch(e){}})();`;
