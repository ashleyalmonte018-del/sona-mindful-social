// Browser-only canvas rendering for Maker Space. Only call from effects or event handlers.
import { adjustPixels, ASPECTS, cropRect, rotatedSize, type EditState } from "@/lib/sona/image-edit";

/** Loads a file into a downscaled canvas so later edits stay fast. */
export async function loadSource(file: File, maxSide = 1800): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That image couldn't be opened."));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rotate, crop and colour-adjust the source into a new canvas no larger than maxSide. */
export function renderBase(src: HTMLCanvasElement, s: EditState, maxSide: number): HTMLCanvasElement {
  const { w: rw, h: rh } = rotatedSize(src.width, src.height, s.rotation);
  const rot = document.createElement("canvas");
  rot.width = rw;
  rot.height = rh;
  const rctx = rot.getContext("2d")!;
  rctx.translate(rw / 2, rh / 2);
  rctx.rotate((s.rotation * Math.PI) / 180);
  rctx.drawImage(src, -src.width / 2, -src.height / 2);

  const ratio = ASPECTS.find((a) => a.id === s.aspect)?.ratio ?? null;
  const { sx, sy, sw, sh } = cropRect(rw, rh, ratio, s.zoom, s.panX, s.panY);
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  const ctx = out.getContext("2d")!;
  ctx.drawImage(rot, sx, sy, sw, sh, 0, 0, out.width, out.height);
  if (s.brightness !== 0 || s.contrast !== 0 || s.preset !== "none") {
    const data = ctx.getImageData(0, 0, out.width, out.height);
    adjustPixels(data.data, s.brightness, s.contrast, s.preset);
    ctx.putImageData(data, 0, 0);
  }
  return out;
}

/** Draws drawing strokes, stickers and text on top of the base. */
export function drawOverlays(ctx: CanvasRenderingContext2D, w: number, h: number, s: EditState, selectedId?: string | null) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const st of s.strokes) {
    if (st.points.length < 2) continue;
    ctx.strokeStyle = st.color;
    ctx.lineWidth = Math.max(1, st.size * w);
    ctx.beginPath();
    ctx.moveTo(st.points[0]! * w, st.points[1]! * h);
    for (let i = 2; i < st.points.length; i += 2) ctx.lineTo(st.points[i]! * w, st.points[i + 1]! * h);
    if (st.points.length === 2) ctx.lineTo(st.points[0]! * w + 0.1, st.points[1]! * h);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const k of s.stickers) {
    ctx.font = `${Math.round(k.size * w)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.fillText(k.emoji, k.x * w, k.y * h);
    if (k.id === selectedId) outline(ctx, k.x * w, k.y * h, k.size * w * 1.2, k.size * w * 1.2);
  }
  for (const t of s.texts) {
    const px = Math.round(t.size * w);
    ctx.font = `600 ${px}px "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif`;
    ctx.lineWidth = Math.max(2, px / 8);
    ctx.strokeStyle = t.color.toLowerCase() === "#ffffff" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.7)";
    ctx.strokeText(t.text, t.x * w, t.y * h);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x * w, t.y * h);
    if (t.id === selectedId) outline(ctx, t.x * w, t.y * h, ctx.measureText(t.text).width + px * 0.4, px * 1.4);
  }
}

function outline(ctx: CanvasRenderingContext2D, cx: number, cy: number, bw: number, bh: number) {
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(20,20,20,0.7)";
  ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
  ctx.restore();
}

/** Final JPEG for upload. */
export async function exportPhoto(src: HTMLCanvasElement, s: EditState, maxSide = 1440): Promise<Blob> {
  const base = renderBase(src, s, maxSide);
  const ctx = base.getContext("2d")!;
  drawOverlays(ctx, base.width, base.height, s);
  return new Promise((resolve, reject) =>
    base.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't prepare the photo."))), "image/jpeg", 0.9),
  );
}
