// Minigame logic for the Zone. Pure and deterministic where possible.

// ---------- Tic Tac Toe ----------
export type Mark = "X" | "O" | null;
export const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function tttWinner(b: Mark[]): { winner: "X" | "O" | "draw" | null; line?: number[] } {
  for (const l of TTT_LINES) {
    const [a, c, d] = l;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a] as "X" | "O", line: l };
  }
  return b.every(Boolean) ? { winner: "draw" } : { winner: null };
}

function minimax(b: Mark[], turn: "X" | "O", me: "X" | "O"): number {
  const w = tttWinner(b).winner;
  if (w === me) return 10;
  if (w === "draw") return 0;
  if (w) return -10;
  const scores: number[] = [];
  b.forEach((v, i) => {
    if (v) return;
    const n = [...b];
    n[i] = turn;
    scores.push(minimax(n, turn === "X" ? "O" : "X", me) * 0.9);
  });
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

/** Best move for `me`. `playful` adds a chance of a random move so kids can win. */
export function tttBestMove(b: Mark[], me: "X" | "O", playful = 0, rand = Math.random): number {
  const empty = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (!empty.length) return -1;
  if (playful > 0 && rand() < playful) return empty[Math.floor(rand() * empty.length)];
  let best = empty[0];
  let bestScore = -Infinity;
  for (const i of empty) {
    const n = [...b];
    n[i] = me;
    const s = minimax(n, me === "X" ? "O" : "X", me);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

// ---------- Rock Paper Scissors ----------
export type RPS = "rock" | "paper" | "scissors";
export const RPS_BEATS: Record<RPS, RPS> = { rock: "scissors", paper: "rock", scissors: "paper" };
export function rpsResult(a: RPS, b: RPS): "win" | "lose" | "draw" {
  if (a === b) return "draw";
  return RPS_BEATS[a] === b ? "win" : "lose";
}

// ---------- Odds and Evens ----------
export type Parity = "odds" | "evens";
/** Both players throw 1–5 fingers; the caller of the sum's parity wins. */
export function oddsEvensWinner(call: Parity, a: number, b: number): "caller" | "other" {
  const sumParity: Parity = (a + b) % 2 === 0 ? "evens" : "odds";
  return sumParity === call ? "caller" : "other";
}

// ---------- Dots and Boxes ----------
export interface DotsState {
  rows: number; // boxes per column
  cols: number; // boxes per row
  h: (0 | 1 | 2)[][]; // horizontal lines [rows+1][cols], 0 = empty, else owner player
  v: (0 | 1 | 2)[][]; // vertical lines [rows][cols+1]
  boxes: (0 | 1 | 2)[][]; // [rows][cols]
  turn: 1 | 2;
}
export type DotsLine = { kind: "h" | "v"; r: number; c: number };

export function newDots(rows = 3, cols = 3): DotsState {
  return {
    rows,
    cols,
    h: Array.from({ length: rows + 1 }, () => Array(cols).fill(0)),
    v: Array.from({ length: rows }, () => Array(cols + 1).fill(0)),
    boxes: Array.from({ length: rows }, () => Array(cols).fill(0)),
    turn: 1,
  };
}

function sides(s: DotsState, r: number, c: number) {
  return [s.h[r][c], s.h[r + 1][c], s.v[r][c], s.v[r][c + 1]].filter(Boolean).length;
}

function adjacentBoxes(s: DotsState, line: DotsLine): [number, number][] {
  const out: [number, number][] = [];
  if (line.kind === "h") {
    if (line.r > 0) out.push([line.r - 1, line.c]);
    if (line.r < s.rows) out.push([line.r, line.c]);
  } else {
    if (line.c > 0) out.push([line.r, line.c - 1]);
    if (line.c < s.cols) out.push([line.r, line.c]);
  }
  return out;
}

export function isTaken(s: DotsState, l: DotsLine) {
  return (l.kind === "h" ? s.h[l.r][l.c] : s.v[l.r][l.c]) !== 0;
}

/** Draw a line. Completing a box scores it and grants another turn. */
export function playDots(s: DotsState, line: DotsLine): { state: DotsState; completed: number } {
  if (isTaken(s, line)) return { state: s, completed: 0 };
  const n: DotsState = {
    ...s,
    h: s.h.map((r) => [...r]),
    v: s.v.map((r) => [...r]),
    boxes: s.boxes.map((r) => [...r]),
  };
  if (line.kind === "h") n.h[line.r][line.c] = s.turn;
  else n.v[line.r][line.c] = s.turn;
  let completed = 0;
  for (const [r, c] of adjacentBoxes(n, line)) {
    if (n.boxes[r][c] === 0 && sides(n, r, c) === 4) {
      n.boxes[r][c] = s.turn;
      completed++;
    }
  }
  n.turn = completed ? s.turn : s.turn === 1 ? 2 : 1;
  return { state: n, completed };
}

export function allLines(s: DotsState): DotsLine[] {
  const out: DotsLine[] = [];
  for (let r = 0; r <= s.rows; r++) for (let c = 0; c < s.cols; c++) out.push({ kind: "h", r, c });
  for (let r = 0; r < s.rows; r++) for (let c = 0; c <= s.cols; c++) out.push({ kind: "v", r, c });
  return out;
}

export function dotsScore(s: DotsState) {
  let p1 = 0;
  let p2 = 0;
  s.boxes.forEach((row) => row.forEach((b) => (b === 1 ? p1++ : b === 2 ? p2++ : null)));
  return { p1, p2, done: p1 + p2 === s.rows * s.cols };
}

/** Simple AI: take a box if possible, avoid giving one away, else random. */
export function dotsAiMove(s: DotsState, rand = Math.random): DotsLine | null {
  const free = allLines(s).filter((l) => !isTaken(s, l));
  if (!free.length) return null;
  const completes = free.find((l) => adjacentBoxes(s, l).some(([r, c]) => sides(s, r, c) === 3));
  if (completes) return completes;
  const safe = free.filter((l) => adjacentBoxes(s, l).every(([r, c]) => sides(s, r, c) < 2));
  const pool = safe.length ? safe : free;
  return pool[Math.floor(rand() * pool.length)];
}
