import { Brush, Crop, Palette, RotateCcw, RotateCw, Smile, SunMedium, Trash2, Type, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { drawOverlays, renderBase } from "@/components/makerspace/render";
import { ASPECTS, DEFAULT_EDIT, FILTER_PRESETS, rotateNext, STICKERS, type EditState } from "@/lib/sona/image-edit";
import { cn } from "@/lib/utils";

type Tool = "crop" | "adjust" | "filters" | "text" | "stickers" | "draw";
const TOOLS: { id: Tool; label: string; icon: typeof Crop }[] = [
  { id: "crop", label: "Crop & rotate", icon: Crop },
  { id: "adjust", label: "Light", icon: SunMedium },
  { id: "filters", label: "Filters", icon: Palette },
  { id: "text", label: "Text", icon: Type },
  { id: "stickers", label: "Stickers", icon: Smile },
  { id: "draw", label: "Draw", icon: Brush },
];
// Ink colours for text and drawing on the photo itself (image content, not app theme).
const INKS = ["#ffffff", "#111111", "#d7f75b", "#f08a24", "#e5484d", "#4f7cf0", "#c9a0dc", "#7fd1b9"];

const uid = () => Math.random().toString(36).slice(2, 10);

export function PhotoEditor({ source, state, onChange }: { source: HTMLCanvasElement; state: EditState; onChange: (s: EditState) => void }) {
  const [tool, setTool] = useState<Tool>("crop");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [ink, setInk] = useState(INKS[0]!);
  const [brush, setBrush] = useState(0.012);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ kind: "draw" } | { kind: "move"; id: string; dx: number; dy: number } | null>(null);
  const live = useRef(state);
  live.current = state;

  const base = useMemo(
    () => renderBase(source, state, 960),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, state.rotation, state.aspect, state.zoom, state.panX, state.panY, state.brightness, state.contrast, state.preset],
  );

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = base.width;
    c.height = base.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(base, 0, 0);
    drawOverlays(ctx, c.width, c.height, state, tool === "text" || tool === "stickers" ? selected : null);
  }, [base, state, selected, tool]);

  const set = (p: Partial<EditState>) => onChange({ ...live.current, ...p });

  function point(e: ReactPointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  }

  function hit(x: number, y: number): string | null {
    const w = base.width;
    const h = base.height;
    for (const t of [...state.texts].reverse()) {
      const half = (t.text.length * t.size * 0.3 * w) / w + 0.02;
      if (Math.abs(x - t.x) < half && Math.abs(y - t.y) * h < t.size * w * 0.8) return t.id;
    }
    for (const k of [...state.stickers].reverse()) {
      if (Math.abs(x - k.x) * w < k.size * w * 0.7 && Math.abs(y - k.y) * h < k.size * w * 0.7) return k.id;
    }
    return null;
  }

  function onDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = point(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "draw") {
      drag.current = { kind: "draw" };
      set({ strokes: [...state.strokes, { color: ink, size: brush, points: [p.x, p.y] }] });
      return;
    }
    const id = hit(p.x, p.y);
    setSelected(id);
    if (id) {
      const layer = state.texts.find((t) => t.id === id) ?? state.stickers.find((k) => k.id === id)!;
      drag.current = { kind: "move", id, dx: p.x - layer.x, dy: p.y - layer.y };
      if (state.texts.some((t) => t.id === id)) setTool("text");
      else setTool("stickers");
    }
  }

  function onMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d) return;
    const p = point(e);
    const s = live.current;
    if (d.kind === "draw") {
      const strokes = s.strokes.slice();
      const last = strokes[strokes.length - 1];
      if (!last) return;
      strokes[strokes.length - 1] = { ...last, points: [...last.points, p.x, p.y] };
      set({ strokes });
    } else {
      const x = p.x - d.dx;
      const y = p.y - d.dy;
      set({
        texts: s.texts.map((t) => (t.id === d.id ? { ...t, x, y } : t)),
        stickers: s.stickers.map((k) => (k.id === d.id ? { ...k, x, y } : k)),
      });
    }
  }

  const selText = state.texts.find((t) => t.id === selected);
  const selSticker = state.stickers.find((k) => k.id === selected);

  return (
    <div className="space-y-4">
      <div className="flex justify-center rounded-[1.5rem] border border-border bg-secondary/60 p-3">
        <canvas
          ref={canvas}
          aria-label="Photo preview — drag text or stickers to move them, or draw in Draw mode"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          className={cn("block h-auto max-h-[60vh] w-auto max-w-full touch-none rounded-xl", tool === "draw" ? "cursor-crosshair" : "cursor-grab")}
        />
      </div>

      <div role="tablist" aria-label="Editing tools" className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tool === t.id}
            onClick={() => setTool(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition",
              tool === t.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => onChange(DEFAULT_EDIT)}>
          Reset all
        </Button>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-card p-4">
        {tool === "crop" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ASPECTS.map((a) => (
                <Button key={a.id} size="sm" variant={state.aspect === a.id ? "ink" : "soft"} onClick={() => set({ aspect: a.id, panX: 0, panY: 0 })}>
                  {a.label}
                </Button>
              ))}
              <span className="mx-1 w-px bg-border" />
              <Button size="sm" variant="soft" onClick={() => set({ rotation: rotateNext(state.rotation, -1), panX: 0, panY: 0 })} aria-label="Rotate left">
                <RotateCcw />
              </Button>
              <Button size="sm" variant="soft" onClick={() => set({ rotation: rotateNext(state.rotation, 1), panX: 0, panY: 0 })} aria-label="Rotate right">
                <RotateCw />
              </Button>
            </div>
            <Range label="Zoom" min={1} max={3} step={0.05} value={state.zoom} onChange={(v) => set({ zoom: v })} />
            <Range label="Move left / right" min={-1} max={1} step={0.02} value={state.panX} onChange={(v) => set({ panX: v })} />
            <Range label="Move up / down" min={-1} max={1} step={0.02} value={state.panY} onChange={(v) => set({ panY: v })} />
          </div>
        )}
        {tool === "adjust" && (
          <div className="space-y-4">
            <Range label="Brightness" min={-100} max={100} step={1} value={state.brightness} onChange={(v) => set({ brightness: v })} />
            <Range label="Contrast" min={-100} max={100} step={1} value={state.contrast} onChange={(v) => set({ contrast: v })} />
          </div>
        )}
        {tool === "filters" && (
          <div className="flex flex-wrap gap-2">
            {FILTER_PRESETS.map((f) => (
              <Button key={f.id} size="sm" variant={state.preset === f.id ? "ink" : "soft"} onClick={() => set({ preset: f.id })}>
                {f.label}
              </Button>
            ))}
          </div>
        )}
        {tool === "text" && (
          <div className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = draft.trim().slice(0, 60);
                if (!text) return;
                const id = uid();
                set({ texts: [...state.texts, { id, text, x: 0.5, y: 0.5, size: 0.08, color: ink }] });
                setSelected(id);
                setDraft("");
              }}
            >
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type something…" maxLength={60} className="rounded-full" aria-label="Text to add" />
              <Button type="submit" variant="ink">
                Add text
              </Button>
            </form>
            <Inks value={selText?.color ?? ink} onPick={(c) => (setInk(c), selText && set({ texts: state.texts.map((t) => (t.id === selText.id ? { ...t, color: c } : t)) }))} />
            {selText ? (
              <div className="space-y-3">
                <Input
                  value={selText.text}
                  maxLength={60}
                  aria-label="Edit selected text"
                  className="rounded-full"
                  onChange={(e) => set({ texts: state.texts.map((t) => (t.id === selText.id ? { ...t, text: e.target.value } : t)) })}
                />
                <Range label="Size" min={0.03} max={0.2} step={0.005} value={selText.size} onChange={(v) => set({ texts: state.texts.map((t) => (t.id === selText.id ? { ...t, size: v } : t)) })} />
                <Button size="sm" variant="soft" onClick={() => (set({ texts: state.texts.filter((t) => t.id !== selText.id) }), setSelected(null))}>
                  <Trash2 /> Remove text
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Tap text on the photo to select it, then drag to move.</p>
            )}
          </div>
        )}
        {tool === "stickers" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {STICKERS.map((s) => (
                <button
                  key={s}
                  aria-label={`Add sticker ${s}`}
                  className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-xl transition hover:border-foreground/40"
                  onClick={() => {
                    const id = uid();
                    set({ stickers: [...state.stickers, { id, emoji: s, x: 0.5, y: 0.5, size: 0.14 }] });
                    setSelected(id);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {selSticker ? (
              <div className="space-y-3">
                <Range label="Size" min={0.05} max={0.4} step={0.01} value={selSticker.size} onChange={(v) => set({ stickers: state.stickers.map((k) => (k.id === selSticker.id ? { ...k, size: v } : k)) })} />
                <Button size="sm" variant="soft" onClick={() => (set({ stickers: state.stickers.filter((k) => k.id !== selSticker.id) }), setSelected(null))}>
                  <Trash2 /> Remove sticker
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Tap a sticker on the photo to resize it, or drag to move.</p>
            )}
          </div>
        )}
        {tool === "draw" && (
          <div className="space-y-4">
            <Inks value={ink} onPick={setInk} />
            <Range label="Brush size" min={0.004} max={0.04} step={0.002} value={brush} onChange={setBrush} />
            <div className="flex gap-2">
              <Button size="sm" variant="soft" disabled={!state.strokes.length} onClick={() => set({ strokes: state.strokes.slice(0, -1) })}>
                <Undo2 /> Undo
              </Button>
              <Button size="sm" variant="soft" disabled={!state.strokes.length} onClick={() => set({ strokes: [] })}>
                <Trash2 /> Clear drawing
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Range({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Number.isInteger(step) ? value : value.toFixed(2)}</span>
      </span>
      <Slider className="mt-2" min={min} max={max} step={step} value={[value]} onValueChange={([v]) => v !== undefined && onChange(v)} aria-label={label} />
    </label>
  );
}

function Inks({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
      {INKS.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onPick(c)}
          className={cn("size-8 rounded-full border-2 transition", value === c ? "border-ink scale-110" : "border-border")}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
