import { useId, type CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { DEFAULT_LOOK, type BodyType, type DoodleStroke, type SonaLook } from "@/lib/sona/types";

// A Sona is drawn as one silhouette (head + neck + torso + limbs) painted twice:
// first as a wide outline stroke, then as a narrower fill. Every clothing and
// hair layer reuses the exact same geometry, so layers always line up.

type Pt = [number, number];
type Limb = [Pt, Pt];

interface PoseDef {
  armL: Limb;
  armR: Limb;
  legL: Limb;
  legR: Limb;
  oy?: number;
  prop?: "book" | "megaphone" | "box" | "envelope" | "alert" | "heart" | "zz" | "question" | "note";
  holds?: boolean;
}

const stand: Pick<PoseDef, "legL" | "legR"> = {
  legL: [[-2, 22], [-3, 44]],
  legR: [[2, 22], [3, 44]],
};
const ledge: Pick<PoseDef, "legL" | "legR" | "oy"> = {
  legL: [[-5, 10], [-7, 30]],
  legR: [[5, 10], [7, 30]],
  oy: 10,
};

export const POSES: Record<string, PoseDef> = {
  stand: { armL: [[-5, 17], [-7, 34]], armR: [[5, 17], [7, 34]], ...stand },
  wave: { armL: [[-5, 17], [-7, 34]], armR: [[13, -6], [17, -24]], ...stand },
  cheer: {
    armL: [[-12, -13], [-17, -30]],
    armR: [[12, -13], [17, -30]],
    legL: [[-6, 21], [-12, 42]],
    legR: [[6, 21], [12, 42]],
  },
  jump: {
    armL: [[-16, -4], [-30, -3]],
    armR: [[16, -4], [30, -3]],
    legL: [[-12, 13], [-6, 28]],
    legR: [[12, 13], [6, 28]],
    oy: -6,
  },
  run: {
    armL: [[-14, 8], [-21, -4]],
    armR: [[10, 16], [20, 25]],
    legL: [[-14, 14], [-27, 25]],
    legR: [[6, 22], [16, 42]],
  },
  sit: {
    armL: [[-10, 13], [-19, 11]],
    armR: [[-2, 16], [-13, 15]],
    legL: [[-15, -8], [-24, 16]],
    legR: [[-9, -5], [-17, 20]],
    oy: 26,
  },
  read: { armL: [[-9, 14], [-2, 10]], armR: [[9, 14], [2, 10]], ...ledge, prop: "book", holds: true },
  megaphone: {
    armL: [[-14, 6], [-10, -10]],
    armR: [[10, -10], [12, -28]],
    legL: [[-8, 20], [-14, 42]],
    legR: [[6, 22], [10, 44]],
    prop: "megaphone",
    holds: true,
  },
  box: {
    armL: [[-8, 16], [-4, 26]],
    armR: [[8, 16], [4, 26]],
    legL: [[-4, 22], [-11, 42]],
    legR: [[4, 22], [8, 44]],
    prop: "box",
    holds: true,
  },
  envelope: {
    armL: [[-13, 10], [-7, 18]],
    armR: [[5, 14], [-3, 18]],
    legL: [[-3, 22], [-5, 44]],
    legR: [[3, 22], [5, 44]],
    prop: "envelope",
    holds: true,
  },
  alert: { armL: [[-13, 12], [-24, 17]], armR: [[13, 12], [24, 17]], ...stand, prop: "alert" },
  dance: {
    armL: [[-12, -10], [-14, -28]],
    armR: [[13, 10], [6, 22]],
    legL: [[-8, 20], [-6, 42]],
    legR: [[11, 16], [17, 36]],
  },
  hug: { armL: [[-9, 14], [-2, 12]], armR: [[9, 14], [2, 12]], ...stand, prop: "heart", holds: true },
  rest: { armL: [[-5, 17], [-7, 34]], armR: [[5, 17], [7, 34]], ...ledge, prop: "zz" },
  think: { armL: [[-5, 17], [-7, 34]], armR: [[11, 10], [-4, -4]], ...stand, prop: "question" },
  sing: { armL: [[-12, -13], [-17, -30]], armR: [[5, 17], [7, 34]], ...stand, prop: "note" },
};

export const POSE_OPTIONS = [
  "wave", "stand", "cheer", "jump", "run", "dance", "sit", "read", "megaphone", "box", "envelope", "hug", "think", "sing", "rest", "alert",
];

interface BodyDims {
  headR: number;
  top: number;
  bottom: number;
  sw: number;
  hw: number;
  limb: number;
  arm: number;
  leg: number;
  bulge: number;
}

const BODY: Record<BodyType, BodyDims> = {
  classic: { headR: 16.5, top: 52, bottom: 97, sw: 13.5, hw: 13, limb: 9.5, arm: 1, leg: 1, bulge: 0 },
  slim: { headR: 15.5, top: 52, bottom: 98, sw: 10.5, hw: 10, limb: 7.5, arm: 1, leg: 1, bulge: 0 },
  round: { headR: 17, top: 53, bottom: 98, sw: 15, hw: 19, limb: 10.5, arm: 0.95, leg: 0.95, bulge: 5 },
  tall: { headR: 15.5, top: 46, bottom: 100, sw: 12, hw: 11.5, limb: 8.5, arm: 1.1, leg: 1.1, bulge: 0 },
  petite: { headR: 18.5, top: 58, bottom: 96, sw: 12.5, hw: 13, limb: 9.5, arm: 0.85, leg: 0.82, bulge: 1 },
};

/** Shared viewBox — the doodle canvas maps to exactly this box. */
export const FIGURE_BOX = { x: 0, y: -14, w: 120, h: 178 };

const O = 1.9; // outline thickness
const LINE = "var(--sona-line)";

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const d = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");

function torsoPath(b: BodyDims) {
  const { sw, hw, top, bottom, bulge } = b;
  const r = 7;
  const c = 60;
  return [
    `M ${c - sw} ${top + r}`,
    `Q ${c - sw} ${top} ${c - sw + r} ${top}`,
    `L ${c + sw - r} ${top}`,
    `Q ${c + sw} ${top} ${c + sw} ${top + r}`,
    `C ${c + sw + bulge} ${top + 18} ${c + hw + bulge} ${bottom - 20} ${c + hw} ${bottom - r}`,
    `Q ${c + hw} ${bottom} ${c + hw - r} ${bottom}`,
    `L ${c - hw + r} ${bottom}`,
    `Q ${c - hw} ${bottom} ${c - hw} ${bottom - r}`,
    `C ${c - hw - bulge} ${bottom - 20} ${c - sw - bulge} ${top + 18} ${c - sw} ${top + r}`,
    "Z",
  ].join(" ");
}

export interface SonaFigureProps {
  look?: Partial<SonaLook>;
  pose?: string;
  doodle?: DoodleStroke[];
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Hide the grey ground shadow. */
  noShadow?: boolean;
}

export function SonaFigure({ look: lookIn, pose: poseIn, doodle, className, style, title, noShadow }: SonaFigureProps) {
  const uid = useId().replace(/:/g, "");
  const look = { ...DEFAULT_LOOK, ...lookIn };
  const b = BODY[look.bodyType] ?? BODY.classic;
  const pose = POSES[poseIn ?? look.pose] ?? POSES.wave;
  const skin = look.skin;

  const cx = 60;
  const cy = b.top - b.headR + 1;
  const R = b.headR;
  const SL: Pt = [cx - b.sw + 3.5, b.top + 5];
  const SR: Pt = [cx + b.sw - 3.5, b.top + 5];
  const HL: Pt = [cx - b.hw * 0.5, b.bottom - 4];
  const HR: Pt = [cx + b.hw * 0.5, b.bottom - 4];

  const limb = (o: Pt, l: Limb, s: number): [Pt, Pt, Pt] => [
    o,
    [o[0] + l[0][0] * s, o[1] + l[0][1] * s],
    [o[0] + l[1][0] * s, o[1] + l[1][1] * s],
  ];
  const aL = limb(SL, pose.armL, b.arm);
  const aR = limb(SR, pose.armR, b.arm);
  const lL = limb(HL, pose.legL, b.leg);
  const lR = limb(HR, pose.legR, b.leg);
  const limbs = [lL, lR, aL, aR];
  const neck: Pt[] = [[cx, cy + R - 3], [cx, b.top + 3]];
  const torso = torsoPath(b);
  const lw = b.limb;

  // ----- Clothing -----
  const c = look.clothing;
  const isDress = c === "dress";
  const sleeve = c === "tee" || c === "jersey" ? "short" : c === "longsleeve" || c === "hoodie" || c === "sweater" || c === "jacket" ? "long" : "none";
  const bottom = isDress ? "skirt-top" : c === "overalls" ? "pants" : look.bottom;
  const bottomColor = c === "overalls" ? look.bottomColor : look.bottomColor;

  const sleevePath = (a: [Pt, Pt, Pt]) =>
    sleeve === "short" ? d([a[0], lerp(a[0], a[1], 0.6)]) : sleeve === "long" ? d([a[0], a[1], lerp(a[1], a[2], 0.78)]) : "";
  const legPath = (l: [Pt, Pt, Pt], kind: string) =>
    kind === "pants" ? d([l[0], l[1], lerp(l[1], l[2], 0.86)]) : kind === "shorts" ? d([l[0], lerp(l[0], l[1], 0.6)]) : "";

  const skirtColor = isDress ? look.topColor : bottomColor;
  const skirtTop = b.bottom - 13;
  const skirt = `M ${cx - b.hw - 0.5} ${skirtTop} L ${cx + b.hw + 0.5} ${skirtTop} L ${cx + b.hw + 10} ${b.bottom + 15} Q ${cx} ${b.bottom + 19} ${cx - b.hw - 10} ${b.bottom + 15} Z`;

  // ----- Hair -----
  const hc = look.hairColor;
  const hairBack = (() => {
    switch (look.hairStyle) {
      case "bob":
        return <rect x={cx - R - 3.5} y={cy - R - 2.5} width={2 * R + 7} height={R * 1.85} rx={R} fill={hc} stroke={LINE} strokeWidth={O} />;
      case "long":
        return (
          <path
            d={`M ${cx - R - 3.5} ${cy} A ${R + 3.5} ${R + 3.5} 0 0 1 ${cx + R + 3.5} ${cy} L ${cx + R + 5} ${cy + R + 24} Q ${cx} ${cy + R + 30} ${cx - R - 5} ${cy + R + 24} Z`}
            fill={hc}
            stroke={LINE}
            strokeWidth={O}
          />
        );
      case "ponytail":
        return (
          <g fill={hc} stroke={LINE} strokeWidth={O}>
            <ellipse cx={cx + R + 3} cy={cy + 4} rx={6} ry={13} transform={`rotate(-18 ${cx + R + 3} ${cy + 4})`} />
          </g>
        );
      case "buns":
        return (
          <g fill={hc} stroke={LINE} strokeWidth={O}>
            <circle cx={cx - R * 0.78} cy={cy - R * 0.78} r={7} />
            <circle cx={cx + R * 0.78} cy={cy - R * 0.78} r={7} />
          </g>
        );
      case "curls": {
        const n = 9;
        return (
          <g fill={hc} stroke={LINE} strokeWidth={O}>
            {Array.from({ length: n }, (_, i) => {
              const ang = Math.PI + (i / (n - 1)) * Math.PI;
              return <circle key={i} cx={cx + Math.cos(ang) * (R + 0.5)} cy={cy + Math.sin(ang) * (R + 0.5) + 2} r={5.5} />;
            })}
          </g>
        );
      }
      case "afro": {
        const n = 14;
        const AR = R * 1.38;
        return (
          <g fill={hc} stroke={LINE} strokeWidth={O}>
            {Array.from({ length: n }, (_, i) => {
              const ang = (i / n) * Math.PI * 2;
              return <circle key={i} cx={cx + Math.cos(ang) * AR * 0.86} cy={cy - 3 + Math.sin(ang) * AR * 0.86} r={7} />;
            })}
            <circle cx={cx} cy={cy - 3} r={AR * 0.9} stroke="none" />
          </g>
        );
      }
      case "spiky":
        return (
          <path
            d={`M ${cx - R} ${cy - 2} L ${cx - R + 1} ${cy - R - 6} L ${cx - R * 0.45} ${cy - R + 1} L ${cx - R * 0.1} ${cy - R - 9} L ${cx + R * 0.3} ${cy - R + 1} L ${cx + R * 0.75} ${cy - R - 6} L ${cx + R} ${cy - 2} Z`}
            fill={hc}
            stroke={LINE}
            strokeWidth={O}
            strokeLinejoin="round"
          />
        );
      case "braids":
        return (
          <g strokeLinecap="round">
            {[-1, 1].map((s) => (
              <g key={s}>
                <path d={d([[cx + s * (R - 2), cy + 2], [cx + s * (R + 1), cy + R + 20]])} stroke={LINE} strokeWidth={6 + 2 * O} />
                <path d={d([[cx + s * (R - 2), cy + 2], [cx + s * (R + 1), cy + R + 20]])} stroke={hc} strokeWidth={6} strokeDasharray="4 1.2" />
              </g>
            ))}
          </g>
        );
      default:
        return null;
    }
  })();

  const capPath = (() => {
    const t = cy - R;
    switch (look.hairStyle) {
      case "buzz":
        return `M ${cx - R} ${t} L ${cx + R} ${t} L ${cx + R} ${cy - R * 0.35} Q ${cx} ${cy - R * 0.6} ${cx - R} ${cy - R * 0.35} Z`;
      case "crop":
      case "ponytail":
      case "spiky":
        return `M ${cx - R} ${cy - R * 0.05} Q ${cx - R * 0.35} ${cy - R * 0.6} ${cx + R * 0.2} ${cy - R * 0.28} Q ${cx + R * 0.7} ${cy - R * 0.1} ${cx + R} ${cy + R * 0.05} L ${cx + R} ${t} L ${cx - R} ${t} Z`;
      case "bob":
        return `M ${cx - R} ${cy + R * 0.25} Q ${cx - R * 0.65} ${cy - R * 0.55} ${cx + R * 0.1} ${cy - R * 0.45} Q ${cx + R * 0.8} ${cy - R * 0.4} ${cx + R} ${cy + R * 0.25} L ${cx + R} ${t} L ${cx - R} ${t} Z`;
      case "long":
      case "buns":
      case "braids":
        return `M ${cx - R} ${cy + R * 0.35} Q ${cx - R * 0.55} ${cy - R * 0.7} ${cx} ${cy - R * 0.72} Q ${cx + R * 0.55} ${cy - R * 0.7} ${cx + R} ${cy + R * 0.35} L ${cx + R} ${t} L ${cx - R} ${t} Z`;
      case "curls":
      case "afro":
        return `M ${cx - R} ${cy - R * 0.2} Q ${cx - R * 0.6} ${cy - R * 0.5} ${cx - R * 0.25} ${cy - R * 0.3} Q ${cx} ${cy - R * 0.6} ${cx + R * 0.25} ${cy - R * 0.3} Q ${cx + R * 0.6} ${cy - R * 0.5} ${cx + R} ${cy - R * 0.2} L ${cx + R} ${t} L ${cx - R} ${t} Z`;
      default:
        return null;
    }
  })();

  // ----- Props -----
  const mid = lerp(aL[2], aR[2], 0.5);
  const prop = (() => {
    switch (pose.prop) {
      case "book":
        return (
          <g transform={`translate(${mid[0]} ${mid[1] - 1}) rotate(-8) scale(1.3)`}>
            <rect x={-12} y={-9} width={24} height={17} rx={1.8} fill="var(--prop-purple)" stroke={LINE} strokeWidth={1.2} />
            <path d="M 0 -9 L 0 8" stroke={LINE} strokeWidth={1} opacity={0.6} />
          </g>
        );
      case "box":
        return (
          <g transform={`translate(${mid[0]} ${mid[1] - 4}) scale(1.3)`}>
            <rect x={-15} y={-11} width={30} height={22} rx={1.5} fill="var(--prop-brown)" stroke={LINE} strokeWidth={1.2} />
            <path d="M -15 -5 L 15 -5 M -3 -11 L -3 -5 M 3 -11 L 3 -5" stroke={LINE} strokeWidth={0.9} opacity={0.55} />
          </g>
        );
      case "envelope":
        return (
          <g transform={`translate(${mid[0] - 2} ${mid[1] - 2}) rotate(-14) scale(1.3)`}>
            <rect x={-14} y={-9} width={28} height={18} rx={1.5} fill="var(--prop-orange)" stroke={LINE} strokeWidth={1.2} />
            <path d="M -14 -9 L 0 2 L 14 -9" fill="none" stroke={LINE} strokeWidth={1} opacity={0.7} />
          </g>
        );
      case "megaphone":
        return (
          <g transform={`translate(${aL[2][0] - 2} ${aL[2][1] - 2}) rotate(-12) scale(1.35)`}>
            <path d="M 2 -4 L -18 -11 L -18 9 L 2 4 Z" fill="var(--prop-orange)" stroke={LINE} strokeWidth={1.2} strokeLinejoin="round" />
            <rect x={1} y={-4.5} width={6} height={9} rx={1.5} fill="var(--prop-orange)" stroke={LINE} strokeWidth={1.2} />
          </g>
        );
      case "heart":
        return (
          <path
            transform={`translate(${mid[0]} ${mid[1] - 3}) scale(1.4)`}
            d="M 0 6 C -10 -1 -8 -9 -3 -9 C -1 -9 0 -7 0 -6 C 0 -7 1 -9 3 -9 C 8 -9 10 -1 0 6 Z"
            fill="var(--prop-red)"
            stroke={LINE}
            strokeWidth={1}
          />
        );
      case "alert":
        return (
          <g transform={`translate(${cx + R + 6} ${cy - R - 4}) rotate(-14)`} fill="var(--prop-red)">
            <path d="M -2.4 -14 L 2.4 -14 L 1.2 0 L -1.2 0 Z" />
            <circle cx={0} cy={4.5} r={2.3} />
          </g>
        );
      case "zz":
        return (
          <g fill={LINE} fontFamily="var(--font-display)" fontWeight={500}>
            <text x={cx + R + 2} y={cy - R + 2} fontSize={9}>z</text>
            <text x={cx + R + 9} y={cy - R - 6} fontSize={12}>z</text>
          </g>
        );
      case "question":
        return (
          <text x={cx + R + 3} y={cy - R + 2} fontSize={16} fill={LINE} fontFamily="var(--font-display)" fontWeight={500}>
            ?
          </text>
        );
      case "note":
        return (
          <g transform={`translate(${cx + R + 8} ${cy - R})`} fill={LINE}>
            <path d="M 0 0 L 0 -12 L 8 -14 L 8 -2" fill="none" stroke={LINE} strokeWidth={1.4} />
            <ellipse cx={-2} cy={0} rx={2.8} ry={2.2} />
            <ellipse cx={6} cy={-2} rx={2.8} ry={2.2} />
          </g>
        );
      default:
        return null;
    }
  })();

  return (
    <svg
      viewBox={`${FIGURE_BOX.x} ${FIGURE_BOX.y} ${FIGURE_BOX.w} ${FIGURE_BOX.h}`}
      className={cn("block overflow-visible", className)}
      style={style}
      role="img"
      aria-label={title ?? `${look.name}, a Sona`}
    >
      <defs>
        <clipPath id={`head-${uid}`}>
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
        <clipPath id={`torso-${uid}`}>
          <path d={torso} />
        </clipPath>
      </defs>

      {!noShadow && <ellipse cx={60} cy={152} rx={22} ry={3.5} fill={LINE} opacity={0.14} />}

      <g transform={`translate(0 ${pose.oy ?? 0})`}>
        {hairBack}
        {c === "hoodie" && (
          <path
            d={`M ${cx - R - 3} ${cy + 6} Q ${cx} ${cy + R + 14} ${cx + R + 3} ${cy + 6} L ${cx + R - 2} ${b.top + 6} L ${cx - R + 2} ${b.top + 6} Z`}
            fill={look.topColor}
            stroke={LINE}
            strokeWidth={O}
            strokeLinejoin="round"
          />
        )}

        {/* Silhouette outline */}
        <g stroke={LINE} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {limbs.map((l, i) => (
            <path key={i} d={d(l)} strokeWidth={lw + 2 * O} />
          ))}
          <path d={d(neck)} strokeWidth={lw * 0.9 + 2 * O} />
          <path d={torso} strokeWidth={2 * O} fill={LINE} />
          <circle cx={cx} cy={cy} r={R} strokeWidth={2 * O} fill={LINE} />
        </g>
        {/* Silhouette fill */}
        <g stroke={skin} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {limbs.map((l, i) => (
            <path key={i} d={d(l)} strokeWidth={lw} />
          ))}
          <path d={d(neck)} strokeWidth={lw * 0.9} />
        </g>
        <path d={torso} fill={skin} />
        <circle cx={cx} cy={cy} r={R} fill={skin} />

        {/* Bottoms */}
        {(bottom === "pants" || bottom === "shorts") && (
          <g stroke={bottomColor} fill="none" strokeLinejoin="round">
            <path d={legPath(lL, bottom)} strokeWidth={lw} />
            <path d={legPath(lR, bottom)} strokeWidth={lw} />
            <rect x={0} y={b.bottom - 12} width={120} height={14} fill={bottomColor} stroke="none" clipPath={`url(#torso-${uid})`} />
          </g>
        )}

        {/* Top */}
        {c !== "none" && (
          <g>
            {sleeve !== "none" && (
              <g stroke={look.topColor} fill="none" strokeLinejoin="round">
                <path d={sleevePath(aL)} strokeWidth={lw} />
                <path d={sleevePath(aR)} strokeWidth={lw} />
              </g>
            )}
            <g clipPath={`url(#torso-${uid})`}>
              <rect
                x={0}
                y={0}
                width={120}
                height={c === "overalls" ? b.top + 30 : bottom === "pants" || bottom === "shorts" ? b.bottom - 12 : 120}
                fill={look.topColor}
              />
              {c === "tank" && <ellipse cx={cx} cy={b.top} rx={b.sw * 0.55} ry={5} fill={skin} />}
              {c === "hoodie" && (
                <rect x={cx - b.hw * 0.6} y={b.bottom - 20} width={b.hw * 1.2} height={9} rx={3} fill={LINE} opacity={0.14} />
              )}
              {c === "jacket" && <rect x={cx - 1.6} y={b.top} width={3.2} height={b.bottom - b.top} fill={skin} opacity={0.75} />}
              {c === "sweater" && (
                <path d={`M 0 ${b.bottom - 5} L 120 ${b.bottom - 5} M 0 ${b.bottom - 2.5} L 120 ${b.bottom - 2.5}`} stroke={LINE} strokeWidth={0.8} opacity={0.35} />
              )}
              {c === "jersey" && (
                <text x={cx} y={b.top + 26} textAnchor="middle" fontSize={13} fontWeight={600} fill={skin} fontFamily="var(--font-display)">
                  7
                </text>
              )}
              {c === "overalls" && (
                <>
                  <rect x={cx - b.hw * 0.7} y={b.top + 16} width={b.hw * 1.4} height={b.bottom - b.top} rx={2} fill={bottomColor} />
                  <path d={`M ${cx - b.hw * 0.6} ${b.top + 17} L ${cx - b.sw + 3} ${b.top} M ${cx + b.hw * 0.6} ${b.top + 17} L ${cx + b.sw - 3} ${b.top}`} stroke={bottomColor} strokeWidth={2.6} />
                  <rect x={0} y={b.bottom - 12} width={120} height={14} fill={bottomColor} />
                </>
              )}
            </g>
          </g>
        )}

        {(bottom === "skirt" || bottom === "skirt-top") && (
          <path d={skirt} fill={skirtColor} stroke={LINE} strokeWidth={O} strokeLinejoin="round" />
        )}

        {/* Hair cap (clipped to head) */}
        {capPath && <path d={capPath} fill={hc} clipPath={`url(#head-${uid})`} />}

        {/* Face */}
        {look.face !== "none" && (
          <g fill={LINE}>
            <circle cx={cx - 5} cy={cy + 2} r={1.5} />
            <circle cx={cx + 5} cy={cy + 2} r={1.5} />
            {look.face === "smile" && (
              <path d={`M ${cx - 4} ${cy + 7} Q ${cx} ${cy + 10.5} ${cx + 4} ${cy + 7}`} fill="none" stroke={LINE} strokeWidth={1.3} strokeLinecap="round" />
            )}
          </g>
        )}

        {/* Accessories */}
        {look.accessory === "scarf" && (
          <g strokeLinecap="round">
            <path d={d([[cx - b.sw + 3, b.top + 1], [cx + b.sw - 3, b.top + 1]])} stroke={LINE} strokeWidth={6 + 2 * O} />
            <path d={d([[cx + 4, b.top + 2], [cx + 7, b.top + 16]])} stroke={LINE} strokeWidth={5 + 2 * O} />
            <path d={d([[cx - b.sw + 3, b.top + 1], [cx + b.sw - 3, b.top + 1]])} stroke={look.accessoryColor} strokeWidth={6} />
            <path d={d([[cx + 4, b.top + 2], [cx + 7, b.top + 16]])} stroke={look.accessoryColor} strokeWidth={5} />
          </g>
        )}
        {look.accessory === "cap" && (
          <g fill={look.accessoryColor} stroke={LINE} strokeWidth={O} strokeLinejoin="round">
            <path d={`M ${cx - R - 0.5} ${cy - 3} A ${R + 0.5} ${R + 0.5} 0 0 1 ${cx + R + 0.5} ${cy - 3} Z`} />
            <path d={`M ${cx + R * 0.2} ${cy - 3} L ${cx + R + 11} ${cy - 1} Q ${cx + R + 12} ${cy - 4} ${cx + R} ${cy - 6} Z`} />
          </g>
        )}
        {look.accessory === "headphones" && (
          <g stroke={LINE} strokeWidth={O}>
            <path d={`M ${cx - R - 1} ${cy} A ${R + 2} ${R + 2} 0 0 1 ${cx + R + 1} ${cy}`} fill="none" stroke={look.accessoryColor} strokeWidth={3.5} />
            <rect x={cx - R - 4} y={cy - 5} width={7} height={11} rx={3} fill={look.accessoryColor} />
            <rect x={cx + R - 3} y={cy - 5} width={7} height={11} rx={3} fill={look.accessoryColor} />
          </g>
        )}
        {look.accessory === "glasses" && (
          <g fill="none" stroke={look.accessoryColor === "#ffffff" ? LINE : look.accessoryColor} strokeWidth={1.6}>
            <circle cx={cx - 5.5} cy={cy + 2} r={4} />
            <circle cx={cx + 5.5} cy={cy + 2} r={4} />
            <path d={`M ${cx - 1.5} ${cy + 2} L ${cx + 1.5} ${cy + 2}`} />
          </g>
        )}

        {prop}
        {pose.holds &&
          [aL[2], aR[2]].map((h, i) => (
            <g key={i}>
              <circle cx={h[0]} cy={h[1]} r={lw / 2 + O} fill={LINE} />
              <circle cx={h[0]} cy={h[1]} r={lw / 2} fill={sleeve === "long" ? skin : skin} />
            </g>
          ))}
      </g>

      {/* Personal scribbles */}
      {doodle && doodle.length > 0 && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {doodle.map((s, i) => {
            const pts: string[] = [];
            for (let k = 0; k < s.points.length; k += 2) pts.push(`${s.points[k].toFixed(1)},${s.points[k + 1].toFixed(1)}`);
            return pts.length === 1 ? (
              <circle key={i} cx={s.points[0]} cy={s.points[1]} r={s.size / 2} fill={s.color} />
            ) : (
              <polyline key={i} points={pts.join(" ")} stroke={s.color} strokeWidth={s.size} />
            );
          })}
        </g>
      )}
    </svg>
  );
}

