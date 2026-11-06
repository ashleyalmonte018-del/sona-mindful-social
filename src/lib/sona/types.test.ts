import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, mergeSettings } from "./types";

describe("chat background settings", () => {
  it("uses no wallpaper by default", () => {
    expect(DEFAULT_SETTINGS.chatBackgroundPath).toBeNull();
    expect(mergeSettings({}).chatBackgroundPath).toBeNull();
  });

  it("restores the user's saved wallpaper path", () => {
    expect(mergeSettings({ chatBackgroundPath: "user-1/wallpaper.webp" }).chatBackgroundPath).toBe(
      "user-1/wallpaper.webp",
    );
  });
});
