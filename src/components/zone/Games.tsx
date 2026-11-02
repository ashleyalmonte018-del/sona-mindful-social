import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import {
  allLines,
  dotsAiMove,
  dotsScore,
  isTaken,
  newDots,
  oddsEvensWinner,
  playDots,
  rpsResult,
  tttBestMove,
  tttWinner,
  type DotsLine,
  type Mark,
  type Parity,
  type RPS,
} from "@/lib/sona/games";
import type { SonaLook } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

const DOODLE = ["text-doodle-blue", "text-doodle-red", "text-doodle-yellow", "text-doodle-blue", "text-doodle-green", "text-doodle-red"];

export function DoodleTitle({ text, className }: { text: string; className?: string }) {
  let k = 0;
  return (
    <span className={cn("font-doodle font-semibold tracking-tight", className)} aria-label={text}>
      {text.split("").map((ch, i) =>
        ch === " " ? (
          <span key={i}> </span>
        ) : (
          <span key={i} aria-hidden className={DOODLE[k++ % DOODLE.length]}>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

export interface Players {
  me: { name: string; look: Partial<SonaLook> };
  them: { name: string; look: Partial<SonaLook> };
}

function Scoreboard({ players, a, b, mood }: { players: Players; a: number; b: number; mood: "idle" | "me" | "them" | "draw" }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-end gap-2">
        <SonaFigure look={players.me.look} pose={mood === "me" ? "cheer" : mood === "them" ? "think" : "stand"} className="w-14" />
        <div>
          <p className="text-xs text-muted-foreground">{players.me.name}</p>
          <p className="font-doodle text-3xl text-doodle-blue">{a}</p>
        </div>
      </div>
      <p className="font-doodle text-sm text-muted-foreground">vs</p>
      <div className="flex items-end gap-2 text-right">
        <div>
          <p className="text-xs text-muted-foreground">{players.them.name}</p>
          <p className="font-doodle text-3xl text-doodle-red">{b}</p>
        </div>
        <SonaFigure look={players.them.look} pose={mood === "them" ? "cheer" : mood === "me" ? "alert" : "stand"} className="w-14" />
      </div>
    </div>
  );
}

// ---------- Tic Tac Toe ----------
export function TicTacToe({ players }: { players: Players }) {
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [score, setScore] = useState({ a: 0, b: 0 });
  const [thinking, setThinking] = useState(false);
  const result = tttWinner(board);

  useEffect(() => {
    if (!result.winner) return;
    if (result.winner === "X") setScore((s) => ({ ...s, a: s.a + 1 }));
    if (result.winner === "O") setScore((s) => ({ ...s, b: s.b + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.winner]);

  function play(i: number) {
    if (board[i] || result.winner || thinking) return;
    const n = [...board];
    n[i] = "X";
    setBoard(n);
    if (tttWinner(n).winner) return;
    setThinking(true);
    window.setTimeout(() => {
      const m = tttBestMove(n, "O", 0.3);
      if (m >= 0) {
        const n2 = [...n];
        n2[m] = "O";
        setBoard(n2);
      }
      setThinking(false);
    }, 550);
  }

  const mood = result.winner === "X" ? "me" : result.winner === "O" ? "them" : result.winner === "draw" ? "draw" : "idle";
  return (
    <div className="space-y-5">
      <Scoreboard players={players} a={score.a} b={score.b} mood={mood} />
      <div className="relative mx-auto grid aspect-square w-full max-w-xs grid-cols-3 gap-0 rounded-3xl bg-doodle-paper p-3 shadow-soft">
        {board.map((v, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            aria-label={`Cell ${i + 1}${v ? `, ${v}` : ""}`}
            className={cn(
              "flex items-center justify-center border-foreground/20",
              i % 3 !== 2 && "border-r-[3px]",
              i < 6 && "border-b-[3px]",
              result.line?.includes(i) && "bg-doodle-yellow/30",
            )}
          >
            {v === "X" && (
              <svg viewBox="0 0 40 40" className="size-3/5 animate-pop">
                <path d="M8 8 L32 32 M32 8 L8 32" stroke="var(--doodle-red)" strokeWidth={6} strokeLinecap="round" />
              </svg>
            )}
            {v === "O" && (
              <svg viewBox="0 0 40 40" className="size-3/5 animate-pop">
                <circle cx={20} cy={20} r={13} fill="none" stroke="var(--doodle-blue)" strokeWidth={6} />
              </svg>
            )}
          </button>
        ))}
      </div>
      <Footer
        text={result.winner === "X" ? "You win!" : result.winner === "O" ? `${players.them.name} wins!` : result.winner === "draw" ? "It's a draw" : thinking ? `${players.them.name} is thinking…` : "You're X — your move"}
        onReset={() => setBoard(Array(9).fill(null))}
        showReset={!!result.winner}
      />
    </div>
  );
}

function Footer({ text, onReset, showReset }: { text: string; onReset: () => void; showReset: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-doodle text-lg">{text}</p>
      {showReset && (
        <Button variant="ink" size="sm" onClick={onReset}>
          Play again
        </Button>
      )}
    </div>
  );
}

// ---------- Rock Paper Scissors ----------
const RPS_ICON: Record<RPS, string> = { rock: "✊", paper: "✋", scissors: "✌️" };
export function RockPaperScissors({ players }: { players: Players }) {
  const [round, setRound] = useState<{ me: RPS; them: RPS; r: "win" | "lose" | "draw" } | null>(null);
  const [score, setScore] = useState({ a: 0, b: 0 });
  const [shaking, setShaking] = useState(false);

  function throwHand(me: RPS) {
    setShaking(true);
    setRound(null);
    window.setTimeout(() => {
      const opts: RPS[] = ["rock", "paper", "scissors"];
      const them = opts[Math.floor(Math.random() * 3)];
      const r = rpsResult(me, them);
      setRound({ me, them, r });
      setScore((s) => ({ a: s.a + (r === "win" ? 1 : 0), b: s.b + (r === "lose" ? 1 : 0) }));
      setShaking(false);
    }, 700);
  }

  const mood = !round ? "idle" : round.r === "win" ? "me" : round.r === "lose" ? "them" : "draw";
  return (
    <div className="space-y-5">
      <Scoreboard players={players} a={score.a} b={score.b} mood={mood} />
      <div className="flex items-center justify-center gap-8 rounded-3xl bg-doodle-paper py-8 text-6xl shadow-soft">
        <span className={cn(shaking && "animate-wiggle")}>{round ? RPS_ICON[round.me] : "✊"}</span>
        <span className="font-doodle text-xl text-muted-foreground">vs</span>
        <span className={cn("-scale-x-100", shaking && "animate-wiggle")}>{round ? RPS_ICON[round.them] : "✊"}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(RPS_ICON) as RPS[]).map((h, i) => (
          <button
            key={h}
            disabled={shaking}
            onClick={() => throwHand(h)}
            className={cn(
              "rounded-2xl border-[3px] bg-card py-3 font-doodle text-lg capitalize transition hover:-translate-y-0.5",
              ["border-doodle-blue", "border-doodle-yellow", "border-doodle-green"][i],
            )}
          >
            <span className="mr-1">{RPS_ICON[h]}</span> {h}
          </button>
        ))}
      </div>
      <p className="font-doodle text-lg">
        {shaking ? "Rock… paper… scissors…" : round ? (round.r === "win" ? "You win this round!" : round.r === "lose" ? `${players.them.name} takes it!` : "Same hand — draw!") : "Pick your hand"}
      </p>
    </div>
  );
}

// ---------- Odds and Evens ----------
export function OddsEvens({ players }: { players: Players }) {
  const [call, setCall] = useState<Parity | null>(null);
  const [res, setRes] = useState<{ me: number; them: number; won: boolean } | null>(null);
  const [score, setScore] = useState({ a: 0, b: 0 });

  function show(n: number) {
    if (!call) return;
    const them = 1 + Math.floor(Math.random() * 5);
    const won = oddsEvensWinner(call, n, them) === "caller";
    setRes({ me: n, them, won });
    setScore((s) => ({ a: s.a + (won ? 1 : 0), b: s.b + (won ? 0 : 1) }));
  }

  const mood = !res ? "idle" : res.won ? "me" : "them";
  return (
    <div className="space-y-5">
      <Scoreboard players={players} a={score.a} b={score.b} mood={mood} />
      {!call ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCall("odds")} className="rounded-3xl border-[3px] border-doodle-red bg-card py-6 font-doodle text-2xl text-doodle-red">
            Odds
          </button>
          <button onClick={() => setCall("evens")} className="rounded-3xl border-[3px] border-doodle-blue bg-card py-6 font-doodle text-2xl text-doodle-blue">
            Evens
          </button>
        </div>
      ) : (
        <>
          <p className="font-doodle text-lg">
            You called <span className={call === "odds" ? "text-doodle-red" : "text-doodle-blue"}>{call}</span>. Throw 1–5 fingers:
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n, i) => (
              <button
                key={n}
                onClick={() => show(n)}
                className={cn("aspect-square rounded-2xl border-[3px] bg-card font-doodle text-2xl", ["border-doodle-blue", "border-doodle-red", "border-doodle-yellow", "border-doodle-green", "border-doodle-blue"][i])}
              >
                {n}
              </button>
            ))}
          </div>
          {res && (
            <div className="rounded-3xl bg-doodle-paper p-5 text-center shadow-soft">
              <p className="font-doodle text-3xl">
                {res.me} + {res.them} = <span className={(res.me + res.them) % 2 ? "text-doodle-red" : "text-doodle-blue"}>{res.me + res.them}</span>
              </p>
              <p className="mt-1 font-doodle text-lg">{res.won ? "You win!" : `${players.them.name} wins!`}</p>
            </div>
          )}
          <Button variant="soft" size="sm" onClick={() => { setCall(null); setRes(null); }}>
            Call again
          </Button>
        </>
      )}
    </div>
  );
}

// ---------- Dots and Boxes ----------
const G = 3; // boxes per side
const SP = 60;
const PAD = 20;
export function DotsAndBoxes({ players }: { players: Players }) {
  const [s, setS] = useState(() => newDots(G, G));
  const sc = dotsScore(s);

  useEffect(() => {
    if (s.turn !== 2 || sc.done) return;
    const t = window.setTimeout(() => {
      const m = dotsAiMove(s);
      if (m) setS(playDots(s, m).state);
    }, 500);
    return () => window.clearTimeout(t);
  }, [s, sc.done]);

  function click(l: DotsLine) {
    if (s.turn !== 1 || isTaken(s, l) || sc.done) return;
    setS(playDots(s, l).state);
  }

  const size = PAD * 2 + SP * G;
  const lineColor = (o: number) => (o === 1 ? "var(--doodle-blue)" : o === 2 ? "var(--doodle-red)" : "transparent");
  const mood = !sc.done ? "idle" : sc.p1 > sc.p2 ? "me" : sc.p2 > sc.p1 ? "them" : "draw";

  return (
    <div className="space-y-5">
      <Scoreboard players={players} a={sc.p1} b={sc.p2} mood={mood} />
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-xs rounded-3xl bg-doodle-paper shadow-soft">
        {s.boxes.map((row, r) =>
          row.map((o, c) =>
            o ? (
              <rect key={`b${r}${c}`} x={PAD + c * SP + 4} y={PAD + r * SP + 4} width={SP - 8} height={SP - 8} rx={8} fill={o === 1 ? "var(--doodle-blue)" : "var(--doodle-red)"} opacity={0.22} className="animate-pop" />
            ) : null,
          ),
        )}
        {allLines(s).map((l) => {
          const x1 = PAD + l.c * SP;
          const y1 = PAD + l.r * SP;
          const x2 = l.kind === "h" ? x1 + SP : x1;
          const y2 = l.kind === "h" ? y1 : y1 + SP;
          const owner = l.kind === "h" ? s.h[l.r][l.c] : s.v[l.r][l.c];
          return (
            <g key={`${l.kind}${l.r}${l.c}`} onClick={() => click(l)} className={cn(!owner && s.turn === 1 && "cursor-pointer [&:hover>line:last-child]:stroke-foreground/25")}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={16} />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={lineColor(owner)} strokeWidth={6} strokeLinecap="round" />
            </g>
          );
        })}
        {Array.from({ length: G + 1 }, (_, r) =>
          Array.from({ length: G + 1 }, (_, c) => <circle key={`d${r}${c}`} cx={PAD + c * SP} cy={PAD + r * SP} r={5.5} fill="var(--ink)" />),
        )}
      </svg>
      <Footer
        text={sc.done ? (sc.p1 > sc.p2 ? "You win!" : sc.p2 > sc.p1 ? `${players.them.name} wins!` : "Tied!") : s.turn === 1 ? "Your turn — draw a line" : `${players.them.name} is drawing…`}
        showReset={sc.done}
        onReset={() => setS(newDots(G, G))}
      />
    </div>
  );
}

export const GAMES = [
  { id: "ttt", title: "Tic Tac Toe", blurb: "Three in a row", C: TicTacToe },
  { id: "rps", title: "Rock Paper Scissors", blurb: "Best hand wins", C: RockPaperScissors },
  { id: "oe", title: "Odds and Evens", blurb: "Call it, then throw", C: OddsEvens },
  { id: "dots", title: "Dots and Boxes", blurb: "Close the most boxes", C: DotsAndBoxes },
] as const;
