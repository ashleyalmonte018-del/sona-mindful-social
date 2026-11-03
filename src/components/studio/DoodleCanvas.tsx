import { useCallback, useEffect, useRef } from "react";

import { FIGURE_BOX } from "@/components/sona/SonaFigure";
import type { DoodleStroke } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

/**
 * A <canvas> overlay that maps 1:1 onto the SonaFigure viewBox. Strokes are
 * stored in figure coordinates so they line up at every size.
 */
export function DoodleCanvas({
  strokes,
  onStroke,
  color,
  size,
  active,
  className,
}: {
  strokes: DoodleStroke[];
  onStroke: (s: DoodleStroke) => void;
  color: string;
  size: number;
  active: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const current = useRef<DoodleStroke | null>(null);

  const draw = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(rect.width * dpr)) {
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
    }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const s = (rect.width * dpr) / FIGURE_BOX.w;
    ctx.setTransform(s, 0, 0, s, -FIGURE_BOX.x * s, -FIGURE_BOX.y * s);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const all = current.current ? [...strokes, current.current] : strokes;
    for (const st of all) {
      ctx.strokeStyle = st.color;
      ctx.fillStyle = st.color;
      ctx.lineWidth = st.size;
      if (st.points.length === 2) {
        ctx.beginPath();
        ctx.arc(st.points[0]!, st.points[1]!, st.size / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(st.points[0]!, st.points[1]!);
      for (let i = 2; i < st.points.length; i += 2) ctx.lineTo(st.points[i]!, st.points[i + 1]!);
      ctx.stroke();
    }
  }, [strokes]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [draw]);

  function pt(e: React.PointerEvent): [number, number] {
    const r = ref.current!.getBoundingClientRect();
    return [
      +(((e.clientX - r.left) / r.width) * FIGURE_BOX.w + FIGURE_BOX.x).toFixed(1),
      +(((e.clientY - r.top) / r.height) * FIGURE_BOX.h + FIGURE_BOX.y).toFixed(1),
    ];
  }

  return (
    <canvas
      ref={ref}
      aria-label="Doodle canvas — draw on your Sona"
      className={cn("absolute inset-0 h-full w-full touch-none", active ? "cursor-crosshair" : "pointer-events-none", className)}
      onPointerDown={(e) => {
        if (!active) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        current.current = { color, size, points: pt(e) };
        draw();
      }}
      onPointerMove={(e) => {
        if (!current.current) return;
        const [x, y] = pt(e);
        const p = current.current.points;
        const lx = p[p.length - 2]!;
        const ly = p[p.length - 1]!;
        if (Math.hypot(x - lx, y - ly) < 0.8) return;
        p.push(x, y);
        draw();
      }}
      onPointerUp={() => {
        if (current.current) onStroke(current.current);
        current.current = null;
      }}
      onPointerCancel={() => {
        current.current = null;
        draw();
      }}
    />
  );
}
