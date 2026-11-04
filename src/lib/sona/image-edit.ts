// Pure photo-edit math for Maker Space. No DOM access here, so it is testable and SSR-safe.

export type FilterPreset = "none" | "warm" | "cool" | "mono" | "fade" | "vivid" | "dusk";
export const FILTER_PRESETS: { id: FilterPreset; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "mono", label: "Mono" },
  { id: "fade", label: "Fade" },
  { id: "vivid", label: "Vivid" },
  { id: "dusk", label: "Dusk" },
];

export type AspectId = "original" | "1:1" | "4:5" | "16:9";
export const ASPECTS: { id: AspectId; label: string; ratio: number | null }[] = [
  { id: "original", label: "Original", ratio: null },
  { id: "1:1", label: "Square", ratio: 1 },
  { id: "4:5", label: "Portrait", ratio: 4 / 5 },
  { id: "16:9", label: "Wide", ratio: 16 / 9 },
];

export interface TextLayer {
  id: string;
  text: string;
  /** 0..1 of width/height */
  x: number;
  y: number;
  /** fraction of output width */
  size: number;
  color: string;
}
export interface StickerLayer {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}
export interface Stroke {
  color: string;
  /** fraction of output width */
  size: number;
  /** normalized [x,y,x,y...] */
  points: number[];
}

export interface EditState {
  rotation: 0 | 90 | 180 | 270;
  aspect: AspectId;
  /** 1..3 */
  zoom: number;
  /** -1..1 */
  panX: number;
  panY: number;
  /** -100..100 */
  brightness: number;
  contrast: number;
  preset: FilterPreset;
  texts: TextLayer[];
  stickers: StickerLayer[];
  strokes: Stroke[];
}

export const DEFAULT_EDIT: EditState = {
  rotation: 0,
  aspect: "original",
  zoom: 1,
  panX: 0,
  panY: 0,
  brightness: 0,
  contrast: 0,
  preset: "none",
  texts: [],
  stickers: [],
  strokes: [],
};

export const STICKERS = ["✨", "🌿", "💛", "🌈", "☁️", "🎧", "📚", "🌸", "⭐", "🫶", "🍵", "🎨"];

/** What the editor knows was changed — used to pre-answer the required disclosures. */
export function detectEdits(s: EditState): { edited: boolean; filter: boolean } {
  const edited =
    s.rotation !== 0 ||
    s.aspect !== "original" ||
    s.zoom > 1 ||
    s.brightness !== 0 ||
    s.contrast !== 0 ||
    s.texts.length > 0 ||
    s.stickers.length > 0 ||
    s.strokes.length > 0;
  return { edited, filter: s.preset !== "none" };
}

export const rotateNext = (r: EditState["rotation"], dir: 1 | -1): EditState["rotation"] =>
  (((r + dir * 90) % 360) + 360) % 360 as EditState["rotation"];

export function rotatedSize(w: number, h: number, rotation: EditState["rotation"]) {
  return rotation % 180 === 0 ? { w, h } : { w: h, h: w };
}

/** Source rectangle for a crop with the given aspect, zoom and pan (all inside the source). */
export function cropRect(srcW: number, srcH: number, ratio: number | null, zoom = 1, panX = 0, panY = 0) {
  const r = ratio ?? srcW / srcH;
  let w = srcW;
  let h = w / r;
  if (h > srcH) {
    h = srcH;
    w = h * r;
  }
  const z = Math.min(3, Math.max(1, zoom));
  w /= z;
  h /= z;
  const slackX = srcW - w;
  const slackY = srcH - h;
  const px = Math.min(1, Math.max(-1, panX));
  const py = Math.min(1, Math.max(-1, panY));
  return { sx: (slackX / 2) * (1 + px), sy: (slackY / 2) * (1 + py), sw: w, sh: h };
}

/** Applies brightness, contrast and a filter preset to RGBA pixels in place. */
export function adjustPixels(data: Uint8ClampedArray, brightness: number, contrast: number, preset: FilterPreset) {
  if (brightness === 0 && contrast === 0 && preset === "none") return data;
  const b = brightness * 1.5;
  const c = contrast * 2.55;
  const f = (259 * (c + 255)) / (255 * (259 - c));
  for (let i = 0; i < data.length; i += 4) {
    let r = f * (data[i]! + b - 128) + 128;
    let g = f * (data[i + 1]! + b - 128) + 128;
    let bl = f * (data[i + 2]! + b - 128) + 128;
    switch (preset) {
      case "warm":
        r = r * 1.08 + 8;
        bl = bl * 0.88;
        break;
      case "cool":
        r = r * 0.9;
        bl = bl * 1.08 + 8;
        break;
      case "mono": {
        const l = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = g = bl = l;
        break;
      }
      case "fade":
        r = r * 0.8 + 40;
        g = g * 0.8 + 40;
        bl = bl * 0.8 + 44;
        break;
      case "vivid": {
        const l = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = l + (r - l) * 1.4;
        g = l + (g - l) * 1.4;
        bl = l + (bl - l) * 1.4;
        break;
      }
      case "dusk":
        r = r * 1.05 + 10;
        g = g * 0.94;
        bl = bl * 1.06 + 14;
        break;
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = bl;
  }
  return data;
}
