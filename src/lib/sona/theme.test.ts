import { describe, expect, it } from "vitest";

import { customThemeVars, normalizeTheme, THEME_PRESETS } from "./theme";
import { AGE_MODES, normalizeAgeMode } from "./types";

describe("themes", () => {
  it("has the four agreed gradient presets", () => {
    expect(THEME_PRESETS.map((p) => p.id)).toEqual(["green", "lavender", "dusk", "cream"]);
    expect(THEME_PRESETS.every((p) => p.darkSwatch.length === 3)).toBe(true);
  });

  it("falls back to green light mode for unknown saved values", () => {
    expect(normalizeTheme({ preset: "neon", mode: "sepia", custom: "red" })).toEqual({
      preset: "green",
      custom: "#7fd1b9",
      mode: "light",
    });
  });

  it("keeps a saved dark mode and custom colour", () => {
    expect(normalizeTheme({ preset: "custom", mode: "dark", custom: "#FF8800" })).toEqual({
      preset: "custom",
      custom: "#ff8800",
      mode: "dark",
    });
  });

  it("uses dark text on a light custom colour and light text on a dark one", () => {
    expect(customThemeVars("#f5f0a0")["--lime-foreground"]).toContain("0.2 ");
    expect(customThemeVars("#1d2a6b")["--lime-foreground"]).toContain("0.985");
  });

  it("keeps a custom theme accent in dark mode", () => {
    const vars = customThemeVars("#ff8800", "dark");
    expect(vars["--background"]).toContain("color-mix");
    expect(vars["--lime"]).toContain("#ff8800");
    expect(vars["--accent-foreground"]).toContain("0.95");
  });
});

describe("age modes", () => {
  it("are Sapling (under 13), Sprout (teens) and Bloom (18+)", () => {
    expect(AGE_MODES.map((m) => [m.id, m.label])).toEqual([
      ["sapling", "Sapling"],
      ["sprout", "Sprout"],
      ["bloom", "Bloom"],
    ]);
    expect(AGE_MODES[0]!.who).toBe("Under 13");
    expect(AGE_MODES[2]!.who).toBe("18+");
  });

  it("treats an unknown saved mode as Sprout", () => {
    expect(normalizeAgeMode("open")).toBe("sprout");
  });
});
