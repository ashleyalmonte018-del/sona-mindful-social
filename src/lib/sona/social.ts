// Posts, disclosures, trigger labels and privacy rules. Pure data + logic, safe for server and browser.
// The privacy helpers mirror the database rules (can_view_gallery, reaches_public_feed, profile_card)
// so the UI explains exactly what the database enforces.

export type MediaType = "text" | "photo" | "video";
export type Audience = "public" | "circle";
export type PrivateHides = "followers" | "posts" | "everything";
export type LabelStyle = "loud" | "quiet";

export const MEDIA_TYPES: { id: MediaType; label: string; blurb: string }[] = [
  { id: "photo", label: "Photo", blurb: "Edit, filter, add text, stickers or drawing" },
  { id: "text", label: "Text", blurb: "Just words" },
  { id: "video", label: "Video", blurb: "Up to 60 seconds" },
];

export const AUDIENCES: { id: Audience; label: string; blurb: string }[] = [
  { id: "public", label: "Public Feed", blurb: "Your gallery + the Community feed. Private accounts still only reach approved followers." },
  { id: "circle", label: "Circle", blurb: "Your gallery + the Circle feed — only friends (you follow each other) see it." },
];

export const PRIVATE_HIDES: { id: PrivateHides; label: string; blurb: string }[] = [
  { id: "followers", label: "Follower count only", blurb: "People can see your posts on your profile, but not your follower numbers." },
  { id: "posts", label: "Posts only", blurb: "Your follower numbers show, but your posts are for approved followers." },
  { id: "everything", label: "Everything", blurb: "Only your name and picture show until you approve someone." },
];

export const TRIGGER_LABELS = [
  { id: "body-image", label: "Body image & weight" },
  { id: "food-diet", label: "Food & dieting" },
  { id: "self-harm", label: "Self-harm" },
  { id: "suicide", label: "Suicide" },
  { id: "death-grief", label: "Death & grief" },
  { id: "violence", label: "Violence" },
  { id: "abuse", label: "Abuse" },
  { id: "bullying", label: "Bullying" },
  { id: "substances", label: "Alcohol & drugs" },
  { id: "medical", label: "Needles & medical" },
  { id: "flashing", label: "Flashing lights" },
  { id: "loud-sounds", label: "Loud or sudden sounds" },
] as const;
export type TriggerLabelId = (typeof TRIGGER_LABELS)[number]["id"];
export const triggerLabel = (id: string) => TRIGGER_LABELS.find((t) => t.id === id)?.label ?? id;
/** Labels that should also surface crisis support in the See Why bubble. */
export const CRISIS_LABELS: string[] = ["self-harm", "suicide"];

export type DisclosureId = "edited" | "filter" | "paid";
export const DISCLOSURES: { id: DisclosureId; label: string; question: string }[] = [
  { id: "edited", label: "Edited", question: "Was this edited? (crop, retouch, text, stickers, drawing)" },
  { id: "filter", label: "Filter used", question: "Did you use a filter?" },
  { id: "paid", label: "Paid partnership", question: "Is this a paid partnership or sponsored?" },
];
export type Disclosures = Record<DisclosureId, boolean>;
export type DraftDisclosures = Record<DisclosureId, boolean | null>;

export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BODY_MAX = 2000;
export const NOTE_MAX = 280;
export const BIO_MAX = 300;

export interface UserPost {
  id: string;
  userId: string;
  body: string;
  mediaType: MediaType;
  mediaPath: string | null;
  audience: Audience;
  disclosures: Disclosures;
  note: string | null;
  labels: string[];
  createdAt: string;
  isShareable: boolean;
  circleTiers: string[];
  resharedFrom: string | null;
  sharedBy: string | null;
}

type PostRow = {
  id: string;
  user_id: string;
  body: string;
  media_type: string;
  image_path: string | null;
  audience: string;
  disclosures: unknown;
  disclosure_note: string | null;
  labels: unknown;
  created_at: string;
  is_shareable?: boolean;
  circle_tiers?: string[];
  reshared_from?: string | null;
  shared_by?: string | null;
};

export function parseDisclosures(raw: unknown): Disclosures {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<DisclosureId, unknown>>;
  return { edited: d.edited === true, filter: d.filter === true, paid: d.paid === true };
}

export function toUserPost(r: PostRow): UserPost {
  return {
    id: r.id,
    userId: r.user_id,
    body: r.body,
    mediaType: (["text", "photo", "video"].includes(r.media_type) ? r.media_type : "text") as MediaType,
    mediaPath: r.image_path,
    audience: r.audience === "circle" ? "circle" : "public",
    disclosures: parseDisclosures(r.disclosures),
    note: r.disclosure_note,
    labels: Array.isArray(r.labels) ? (r.labels.filter((l) => typeof l === "string") as string[]) : [],
    createdAt: r.created_at,
    isShareable: r.is_shareable !== false,
    circleTiers: Array.isArray(r.circle_tiers) ? r.circle_tiers : [],
    resharedFrom: r.reshared_from ?? null,
    sharedBy: r.shared_by ?? null,
  };
}

/** Short labels for the small disclosure notification on a post. */
export function disclosureChips(d: Disclosures): string[] {
  return DISCLOSURES.filter((x) => d[x.id]).map((x) => x.label);
}

export interface PostDraft {
  mediaType: MediaType;
  body: string;
  hasMedia: boolean;
  videoSeconds?: number | null;
  mediaBytes?: number | null;
  disclosures: DraftDisclosures;
  note: string;
  labels: string[];
}

/** Everything that blocks publishing. Every disclosure must be answered yes or no. */
export function validateDraft(d: PostDraft): string[] {
  const errors: string[] = [];
  if (d.mediaType === "text" && !d.body.trim()) errors.push("Write something for your text post.");
  if (d.mediaType !== "text" && !d.hasMedia) errors.push(d.mediaType === "photo" ? "Add a photo." : "Add a video.");
  if (d.body.length > BODY_MAX) errors.push(`Keep it under ${BODY_MAX} characters.`);
  if (d.note.length > NOTE_MAX) errors.push(`Keep your edit notes under ${NOTE_MAX} characters.`);
  if (d.mediaType === "video") {
    if (d.videoSeconds != null && d.videoSeconds > VIDEO_MAX_SECONDS) errors.push(`Videos can be up to ${VIDEO_MAX_SECONDS} seconds.`);
    if (d.mediaBytes != null && d.mediaBytes > VIDEO_MAX_BYTES) errors.push("Videos can be up to 50 MB.");
  }
  if (d.mediaType === "photo" && d.mediaBytes != null && d.mediaBytes > PHOTO_MAX_BYTES) errors.push("Photos can be up to 15 MB.");
  for (const x of DISCLOSURES) if (d.disclosures[x.id] === null) errors.push(`Answer: ${x.label.toLowerCase()}?`);
  const known = new Set<string>(TRIGGER_LABELS.map((t) => t.id));
  if (d.labels.some((l) => !known.has(l))) errors.push("Pick trigger labels from the list.");
  return errors;
}

// ---------- Privacy (mirrors the database) ----------

export interface Viewing {
  isMe: boolean;
  isPublic: boolean;
  hides: PrivateHides;
  isApprovedFollower: boolean;
}

/** Can this viewer see the person's profile gallery? */
export function canViewGallery(v: Viewing) {
  return v.isMe || v.isPublic || v.hides === "followers" || v.isApprovedFollower;
}

/** Does a Public Feed post reach this viewer? Account privacy always wins. */
export function reachesPublicFeed(v: Omit<Viewing, "hides">) {
  return v.isMe || v.isPublic || v.isApprovedFollower;
}

/** Can this viewer see follower / following counts? */
export function countsVisible(v: Viewing) {
  return v.isMe || v.isPublic || v.isApprovedFollower || v.hides === "posts";
}

/** Circle posts are only for friends: people who follow each other. */
export function canSeeCirclePost(v: { isMe: boolean; iFollowThem: boolean; theyFollowMe: boolean }) {
  return v.isMe || (v.iFollowThem && v.theyFollowMe);
}

export const ACCENT_PRESETS = ["#d7f75b", "#9db7f5", "#c9a0dc", "#f6b3c6", "#f08a24", "#7fd1b9", "#f5d76e", "#3b4252"];
export const isHexColor = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);
