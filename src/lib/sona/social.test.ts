import { describe, expect, it } from "vitest";

import { adjustPixels, cropRect, DEFAULT_EDIT, detectEdits, rotateNext } from "./image-edit";
import {
  canSeeCirclePost,
  canViewGallery,
  countsVisible,
  disclosureChips,
  reachesPublicFeed,
  validateDraft,
  type PostDraft,
} from "./social";

const draft = (p: Partial<PostDraft> = {}): PostDraft => ({
  mediaType: "text",
  body: "hello",
  hasMedia: false,
  disclosures: { edited: false, filter: false, paid: false },
  note: "",
  labels: [],
  ...p,
});

describe("required disclosures", () => {
  it("blocks publishing until edited, filter and paid partnership are each answered", () => {
    expect(validateDraft(draft({ disclosures: { edited: null, filter: false, paid: false } }))).toContain("Answer: edited?");
    expect(validateDraft(draft({ disclosures: { edited: false, filter: null, paid: false } }))).toContain("Answer: filter used?");
    expect(validateDraft(draft({ disclosures: { edited: false, filter: false, paid: null } }))).toContain("Answer: paid partnership?");
    expect(validateDraft(draft())).toEqual([]);
  });

  it("caps videos at 60 seconds and 50 MB", () => {
    const v = { mediaType: "video" as const, body: "", hasMedia: true };
    expect(validateDraft(draft({ ...v, videoSeconds: 60, mediaBytes: 50 * 1024 * 1024 }))).toEqual([]);
    expect(validateDraft(draft({ ...v, videoSeconds: 61 }))).toContain("Videos can be up to 60 seconds.");
    expect(validateDraft(draft({ ...v, mediaBytes: 50 * 1024 * 1024 + 1 }))).toContain("Videos can be up to 50 MB.");
  });

  it("shows only the disclosed items on the post", () => {
    expect(disclosureChips({ edited: true, filter: false, paid: true })).toEqual(["Edited", "Paid partnership"]);
  });
});

describe("account privacy", () => {
  const stranger = { isMe: false, isApprovedFollower: false };

  it("private accounts never reach the Public Feed beyond approved followers", () => {
    expect(reachesPublicFeed({ ...stranger, isPublic: false })).toBe(false);
    expect(reachesPublicFeed({ ...stranger, isPublic: false, isApprovedFollower: true })).toBe(true);
    expect(reachesPublicFeed({ ...stranger, isPublic: true })).toBe(true);
  });

  it("'Posts only' and 'Everything' hide the gallery from non-followers; 'Follower count only' does not", () => {
    expect(canViewGallery({ ...stranger, isPublic: false, hides: "posts" })).toBe(false);
    expect(canViewGallery({ ...stranger, isPublic: false, hides: "everything" })).toBe(false);
    expect(canViewGallery({ ...stranger, isPublic: false, hides: "followers" })).toBe(true);
  });

  it("'Follower count only' and 'Everything' hide counts from non-followers; 'Posts only' does not", () => {
    expect(countsVisible({ ...stranger, isPublic: false, hides: "followers" })).toBe(false);
    expect(countsVisible({ ...stranger, isPublic: false, hides: "everything" })).toBe(false);
    expect(countsVisible({ ...stranger, isPublic: false, hides: "posts" })).toBe(true);
  });

  it("Circle posts need a mutual follow", () => {
    expect(canSeeCirclePost({ isMe: false, iFollowThem: true, theyFollowMe: false })).toBe(false);
    expect(canSeeCirclePost({ isMe: false, iFollowThem: true, theyFollowMe: true })).toBe(true);
  });
});

describe("photo editing", () => {
  it("pre-answers disclosures from what was changed in the editor", () => {
    expect(detectEdits(DEFAULT_EDIT)).toEqual({ edited: false, filter: false });
    expect(detectEdits({ ...DEFAULT_EDIT, preset: "mono" })).toEqual({ edited: false, filter: true });
    expect(detectEdits({ ...DEFAULT_EDIT, texts: [{ id: "t", text: "hi", x: 0.5, y: 0.5, size: 0.08, color: "#fff" }] }).edited).toBe(true);
  });

  it("crops a square from the middle of a wide photo", () => {
    expect(cropRect(400, 200, 1)).toEqual({ sx: 100, sy: 0, sw: 200, sh: 200 });
  });

  it("rotates in quarter turns both ways", () => {
    expect(rotateNext(0, 1)).toBe(90);
    expect(rotateNext(0, -1)).toBe(270);
  });

  it("mono filter makes every channel equal", () => {
    const px = adjustPixels(new Uint8ClampedArray([200, 100, 50, 255]), 0, 0, "mono");
    expect(px[0]).toBe(px[1]);
    expect(px[1]).toBe(px[2]);
  });
});
