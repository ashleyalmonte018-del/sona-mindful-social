// Core Sona domain types + defaults. Pure data, safe for server and browser.

export const TOPICS = [
  { id: "body", label: "Body & looks", hint: "Glow-ups, appearance, comparisons" },
  { id: "food", label: "Food & diet", hint: "Recipes, meal content, diet talk" },
  { id: "news", label: "News & crises", hint: "World events, disasters, breaking stories" },
  { id: "mental", label: "Mental health talk", hint: "Venting, coping, heavier feelings" },
  { id: "fitness", label: "Fitness & gains", hint: "Workouts, routines, transformations" },
  { id: "drama", label: "Drama & callouts", hint: "Beef, gossip, pile-ons" },
  { id: "hustle", label: "Money & hustle", hint: "Grindset, side hustles, flexing" },
  { id: "romance", label: "Dating & romance", hint: "Crushes, relationships, heartbreak" },
] as const;
export type TopicId = (typeof TOPICS)[number]["id"];

export type Filter = "show" | "soften" | "hold";
export const FILTER_RANK: Record<Filter, number> = { show: 0, soften: 1, hold: 2 };
export const FILTERS: { id: Filter; label: string }[] = [
  { id: "show", label: "Let in" },
  { id: "soften", label: "Soften" },
  { id: "hold", label: "Hold back" },
];

export type GuardLevel = "gentle" | "balanced" | "strict";
export const GUARD_LEVELS: { id: GuardLevel; label: string; blurb: string }[] = [
  { id: "gentle", label: "Gentle", blurb: "Only the most intense posts get softened." },
  { id: "balanced", label: "Balanced", blurb: "Heavy posts soften, the heaviest wait outside." },
  { id: "strict", label: "Strict", blurb: "Anything intense is softened or held back." },
];

export const DIALS = [
  { id: "calm", label: "Calm", hint: "Slow, soft, cozy", color: "var(--dial-1)" },
  { id: "laughs", label: "Laughs", hint: "Memes and silly stuff", color: "var(--dial-2)" },
  { id: "learning", label: "Learning", hint: "Explainers, how-tos", color: "var(--dial-3)" },
  { id: "creative", label: "Creative", hint: "Art, music, making", color: "var(--dial-4)" },
  { id: "movement", label: "Movement", hint: "Walks, sports, dance", color: "var(--dial-5)" },
  { id: "friends", label: "Friends", hint: "Your circle first", color: "var(--dial-6)" },
  { id: "world", label: "World", hint: "News and big topics", color: "var(--dial-7)" },
  { id: "deep", label: "Deep talk", hint: "Feelings and reflection", color: "var(--dial-8)" },
] as const;
export type DialId = (typeof DIALS)[number]["id"];
export type Dials = Record<DialId, number>;

export const VIBE_PRESETS: { id: string; label: string; blurb: string; dials: Dials }[] = [
  {
    id: "chill",
    label: "Chill",
    blurb: "Soft and slow",
    dials: { calm: 90, laughs: 50, learning: 30, creative: 60, movement: 30, friends: 60, world: 10, deep: 30 },
  },
  {
    id: "curious",
    label: "Curious",
    blurb: "Learn something",
    dials: { calm: 40, laughs: 30, learning: 90, creative: 50, movement: 20, friends: 40, world: 50, deep: 50 },
  },
  {
    id: "social",
    label: "Social",
    blurb: "Circle first",
    dials: { calm: 40, laughs: 70, learning: 20, creative: 40, movement: 40, friends: 95, world: 20, deep: 40 },
  },
  {
    id: "maker",
    label: "Maker",
    blurb: "Art + music",
    dials: { calm: 50, laughs: 40, learning: 50, creative: 95, movement: 30, friends: 40, world: 10, deep: 30 },
  },
];

export const MOODS = [
  { id: "inspired", label: "Inspired", color: "var(--mood-inspired)" },
  { id: "calm", label: "Calm", color: "var(--mood-calm)" },
  { id: "happy", label: "Happy", color: "var(--mood-happy)" },
  { id: "bored", label: "Bored", color: "var(--mood-bored)" },
  { id: "tired", label: "Tired", color: "var(--mood-tired)" },
  { id: "anxious", label: "Anxious", color: "var(--mood-anxious)" },
  { id: "sad", label: "Low", color: "var(--mood-sad)" },
  { id: "overwhelmed", label: "Overwhelmed", color: "var(--mood-overwhelmed)" },
] as const;
export type MoodId = (typeof MOODS)[number]["id"];
export const moodColor = (id: string) => MOODS.find((m) => m.id === id)?.color ?? "var(--mood-bored)";
export const moodLabel = (id: string) => MOODS.find((m) => m.id === id)?.label ?? id;

export type AgeMode = "sprout" | "bloom" | "open";
export const AGE_MODES: { id: AgeMode; label: string; who: string; blurb: string }[] = [
  {
    id: "sprout",
    label: "Sprout",
    who: "Under 13",
    blurb: "Hard blocks on heavy topics, strict guard, an 8-post edition and no reels.",
  },
  {
    id: "bloom",
    label: "Bloom",
    who: "13 – 17",
    blurb: "Balanced guard by default and a 12-post edition. You tune the rest.",
  },
  {
    id: "open",
    label: "Open",
    who: "18+",
    blurb: "Full control over every filter with a 15-post edition.",
  },
];

export type CareCondition = "anxiety" | "depression" | "eating" | "asd" | "adhd";

export type PostCategory = "inspiration" | "learning" | "friends" | "reels";
export const CATEGORIES: { id: PostCategory; label: string; blurb: string }[] = [
  { id: "inspiration", label: "Inspiration", blurb: "Ideas that lift you up" },
  { id: "learning", label: "Learning", blurb: "Explainers and how-tos" },
  { id: "friends", label: "Close friends", blurb: "Just your circle" },
  { id: "reels", label: "Reels", blurb: "Tap to play — nothing autoplays" },
];

export interface Post {
  id: string;
  author: string;
  handle: string;
  category: PostCategory;
  topics: TopicId[];
  subgenre: string;
  /** 0 = light, 3 = very intense */
  intensity: 0 | 1 | 2 | 3;
  triggers: string[];
  vibes: Partial<Record<DialId, number>>;
  /** Share of viewers who rated it worth their time afterwards (0..1). */
  worthIt: number;
  /** How fast it is trending / how heated comments are (0..1). */
  volatility: number;
  text: string;
  scene?: { pose: string; tone: "lime" | "orange" | "purple" | "sky" | "sand" };
  offline?: string;
  hoursAgo: number;
}

// ---------- Sona character ----------

export type BodyType = "petite" | "classic" | "slim" | "round" | "tall";
export type HairStyle =
  | "none"
  | "buzz"
  | "crop"
  | "bob"
  | "long"
  | "ponytail"
  | "buns"
  | "curls"
  | "afro"
  | "spiky"
  | "braids";
export type ClothingStyle =
  | "none"
  | "tee"
  | "longsleeve"
  | "hoodie"
  | "overalls"
  | "dress"
  | "jacket"
  | "tank"
  | "sweater"
  | "jersey";
export type Bottom = "none" | "shorts" | "pants" | "skirt";
export type Face = "none" | "dots" | "smile";

export interface SonaLook {
  skin: string;
  bodyType: BodyType;
  hairStyle: HairStyle;
  hairColor: string;
  clothing: ClothingStyle;
  topColor: string;
  bottom: Bottom;
  bottomColor: string;
  accessory: "none" | "scarf" | "cap" | "headphones" | "glasses";
  accessoryColor: string;
  face: Face;
  pose: string;
  name: string;
}

export interface DoodleStroke {
  color: string;
  size: number;
  /** points in figure space (0..120 x, 0..160 y), flattened [x,y,x,y...] */
  points: number[];
}

export const DEFAULT_LOOK: SonaLook = {
  skin: "#ffffff",
  bodyType: "classic",
  hairStyle: "none",
  hairColor: "#2b2220",
  clothing: "none",
  topColor: "#d7f75b",
  bottom: "none",
  bottomColor: "#3b4252",
  accessory: "none",
  accessoryColor: "#f08a24",
  face: "none",
  pose: "wave",
  name: "Sona",
};

// ---------- User settings ----------

export interface SonaSettings {
  curate: Record<TopicId, Filter>;
  guard: GuardLevel;
  vibe: Dials;
  sonaEnabled: boolean;
  allowInteractions: boolean;
  quietMode: boolean;
  checkIns: boolean;
  share: { song: string; artist: string; mood: MoodId };
}

export const DEFAULT_SETTINGS: SonaSettings = {
  curate: {
    body: "soften",
    food: "show",
    news: "soften",
    mental: "show",
    fitness: "show",
    drama: "soften",
    hustle: "show",
    romance: "show",
  },
  guard: "balanced",
  vibe: { calm: 60, laughs: 60, learning: 50, creative: 55, movement: 40, friends: 70, world: 30, deep: 40 },
  sonaEnabled: true,
  allowInteractions: true,
  quietMode: false,
  checkIns: true,
  share: { song: "Pink + White", artist: "Frank Ocean", mood: "calm" },
};

export function mergeSettings(raw: unknown): SonaSettings {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<SonaSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    curate: { ...DEFAULT_SETTINGS.curate, ...(s.curate ?? {}) },
    vibe: { ...DEFAULT_SETTINGS.vibe, ...(s.vibe ?? {}) },
    share: { ...DEFAULT_SETTINGS.share, ...(s.share ?? {}) },
  };
}

export function mergeLook(raw: unknown): SonaLook {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<SonaLook>;
  return { ...DEFAULT_LOOK, ...s };
}

export function parseDoodle(raw: string | null | undefined): DoodleStroke[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as DoodleStroke[]) : [];
  } catch {
    return [];
  }
}
