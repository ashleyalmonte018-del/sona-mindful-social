import { useRef, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

const START = -135;
const SWEEP = 270;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/** A rotary dial (0–100). Drag around it or use arrow keys. */
export function Dial({
  label,
  value,
  onChange,
  color,
  cap,
  capLabel,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  cap?: number | undefined;
  capLabel?: string | undefined;
  className?: string | undefined;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const max = cap ?? 100;
  const v = Math.min(value, max);
  const set = (n: number) => onChange(Math.round(Math.max(0, Math.min(max, n))));

  function fromPointer(e: PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // 0 at top
    if (deg > 180) deg -= 360;
    deg = Math.max(START, Math.min(START + SWEEP, deg));
    set(((deg - START) / SWEEP) * 100);
  }
  function key(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 5;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") set(v + step);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") set(v - step);
    else if (e.key === "Home") set(0);
    else if (e.key === "End") set(max);
    else return;
    e.preventDefault();
  }

  const angle = START + (v / 100) * SWEEP;
  const [kx, ky] = polar(50, 50, 30, angle);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        ref={ref}
        viewBox="0 0 100 100"
        className="size-32 touch-none select-none outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-ring"
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-valuetext={cap !== undefined ? `${v}, capped at ${cap}` : String(v)}
        tabIndex={0}
        onKeyDown={key}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.buttons && fromPointer(e)}
      >
        <path d={arc(50, 50, 40, START, START + SWEEP)} stroke="var(--secondary)" strokeWidth={8} fill="none" strokeLinecap="round" />
        {cap !== undefined && (
          <path
            d={arc(50, 50, 40, START + (cap / 100) * SWEEP, START + SWEEP)}
            stroke="var(--care)"
            strokeOpacity={0.25}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
        )}
        {v > 0 && <path d={arc(50, 50, 40, START, angle)} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round" />}
        <circle cx={50} cy={50} r={26} fill="var(--card)" stroke="var(--border)" />
        <line x1={50} y1={50} x2={kx} y2={ky} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={50} cy={50} r={4} fill="var(--ink)" />
        <text x={50} y={92} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)" fontFamily="var(--font-sans)">
          {v}
        </text>
      </svg>
      <p className="heading-calm mt-1 text-xl">{label}</p>
      {capLabel && <p className="mt-1 rounded-full bg-care-soft px-2 py-0.5 text-[0.7rem] text-care">{capLabel}</p>}
    </div>
  );
}
