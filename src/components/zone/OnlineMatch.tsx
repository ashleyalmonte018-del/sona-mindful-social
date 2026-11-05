import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import type { Players } from "@/components/zone/Games";
import { supabase } from "@/integrations/supabase/client";
import { oddsEvensWinner, playDots, rpsResult, tttWinner, allLines, isTaken, newDots, dotsScore, type DotsLine, type DotsState, type Mark, type Parity, type RPS } from "@/lib/sona/games";
import { cn } from "@/lib/utils";

export type OnlineGameId = "ttt" | "rps" | "oe" | "dots";
type GameState = { board?: Mark[]; turn?: string; winner?: string | null; moves?: Record<string, string>; result?: string; call?: Parity; fingers?: Record<string, number>; dots?: DotsState };
type Match = { id: string; game: OnlineGameId; host_id: string; guest_id: string | null; state: GameState; status: string };
type Props = { myId: string; opponentId?: string; game?: OnlineGameId; players?: Players; fallback?: ReactNode };

const emptyState = (game: OnlineGameId, host: string): GameState => game === "dots" ? { dots: newDots(3, 3), turn: host } : { board: Array(9).fill(null), turn: host, winner: null, moves: {}, fingers: {} };
const gameLabel = (game: OnlineGameId) => ({ ttt: "Tic-Tac-Toe", rps: "Rock-Paper-Scissors", oe: "Odds and Evens", dots: "Dots and Boxes" })[game];
const playerFor = (match: Match, id: string) => match.host_id === id ? 1 : 2;

export function OnlineMatch({ myId, opponentId, game, players, fallback }: Props) {
  const [match, setMatch] = useState<Match | null>(null);
  const [busy, setBusy] = useState(false);
  const [invites, setInvites] = useState<Match[]>([]);
  const [databaseError, setDatabaseError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const recorded = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const board = match?.state.board ?? Array(9).fill(null);
  const mark = match?.host_id === myId ? "X" : "O";
  const winner = useMemo(() => tttWinner(board).winner, [board]);

  useEffect(() => {
    if (!match) return;
    const channel = supabase.channel(`match:${match.id}:${crypto.randomUUID()}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_sessions", filter: `id=eq.${match.id}` }, (payload) => setMatch(payload.new as Match)).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [match?.id]);

  useEffect(() => {
    if (!opponentId || !game || match) return;
    let active = true;
    const start = async () => {
      setBusy(true);
      const [mine, theirs] = await Promise.all([
        supabase.from("match_sessions").select("*").eq("game", game).eq("host_id", myId).eq("guest_id", opponentId).in("status", ["waiting", "active"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("match_sessions").select("*").eq("game", game).eq("host_id", opponentId).eq("guest_id", myId).in("status", ["waiting", "active"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const existing = mine.data ?? theirs.data;
      const created = existing ? null : await supabase.from("match_sessions").insert({ game, host_id: myId, guest_id: opponentId, state: emptyState(game, myId) }).select("*").single();
      const data = existing ?? created?.data;
      const error = existing ? mine.error ?? theirs.error : created?.error;
      if (!active) return;
      setBusy(false);
      if (error) {
        const missing = /match_sessions|schema cache|relation .* does not exist/i.test(error.message);
        setDatabaseError(missing);
        toast.error(missing ? "Games need one database update" : "Couldn't invite that Circle member", { description: error.message });
      } else if (data) setMatch(data as Match);
    };
    void start();
    return () => { active = false; };
  }, [game, myId, opponentId]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("match_sessions").select("*").eq("guest_id", myId).eq("status", "waiting").order("created_at", { ascending: false });
      setInvites((data ?? []) as Match[]);
    };
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [myId]);

  useEffect(() => {
    if (!match || match.status !== "finished" || !match.state.result || recorded.current === match.id || !match.guest_id) return;
    const result = match.state.result;
    void supabase.from("game_results").insert({
      game: match.game,
      winner_id: result === "draw" ? null : result,
      loser_id: result === "draw" ? null : result === match.host_id ? match.guest_id : match.host_id,
      player_a_id: match.host_id,
      player_b_id: match.guest_id,
      match_id: match.id,
    }).then(async ({ error }) => {
      if (error && error.code !== "23505") toast.error("Game result could not be saved", { description: error.message });
      else {
        recorded.current = match.id;
        await queryClient.invalidateQueries({ queryKey: ["game-history"] });
      }
    });
  }, [match, queryClient]);

  async function accept(invite: Match) {
    setBusy(true);
    const { error } = await supabase.from("match_sessions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", invite.id).eq("guest_id", myId);
    setBusy(false);
    if (error) toast.error("Couldn't accept the game", { description: error.message });
    else { setInvites((old) => old.filter((m) => m.id !== invite.id)); setMatch({ ...invite, status: "active" }); }
  }

  async function save(state: GameState, status = "active") {
    if (!match) return;
    const { data, error } = await supabase.from("match_sessions").update({ state, status, updated_at: new Date().toISOString() }).eq("id", match.id).select("*").single();
    if (error) toast.error("That move didn't go through", { description: error.message });
    else setMatch(data as Match);
  }

  async function playTtt(i: number) {
    if (!match || match.status !== "active" || winner || board[i] || match.state.turn !== myId) return;
    const next = [...board]; next[i] = mark;
    const result = tttWinner(next).winner;
    await save({ ...match.state, board: next, turn: match.guest_id === myId ? match.host_id : match.guest_id ?? match.host_id, result: result && result !== "draw" ? (result === "X" ? match.host_id : match.guest_id) : result }, result ? "finished" : "active");
  }

  async function throwRps(hand: RPS) {
    if (!match || match.status !== "active" || match.state.turn !== myId || match.state.moves?.[myId]) return;
    setShaking(true);
    const moves = { ...(match.state.moves ?? {}), [myId]: hand };
    const otherId = match.host_id === myId ? match.guest_id : match.host_id;
    const other = otherId ? moves[otherId] as RPS | undefined : undefined;
    const outcome = other ? rpsResult(hand, other) : null;
    const result = outcome ? outcome === "draw" ? "draw" : outcome === "win" ? myId : otherId : undefined;
    await save({ ...match.state, moves, turn: result ? match.state.turn : otherId ?? match.state.turn, result }, result ? "finished" : "active");
    window.setTimeout(() => setShaking(false), 700);
  }

  async function throwOdds(call?: Parity, fingers?: number) {
    if (!match || match.status !== "active" || match.state.turn !== myId) return;
    const nextCall = call ?? match.state.call;
    if (call && match.host_id !== myId) return;
    if (!nextCall) {
      await save({ ...match.state, call, turn: match.guest_id ?? match.host_id }, "active");
      return;
    }
    const calls = match.state.call ?? nextCall;
    const nums = { ...(match.state.fingers ?? {}), ...(fingers == null ? {} : { [myId]: fingers }) };
    const ids = [match.host_id, match.guest_id].filter(Boolean) as string[];
    const both = ids.length === 2 && nums[ids[0]!] != null && nums[ids[1]!] != null;
    const result = both ? oddsEvensWinner(calls!, nums[match.host_id]!, nums[match.guest_id!]!) === "caller" ? match.host_id : match.guest_id : undefined;
    const nextTurn = result ? match.state.turn : match.host_id === myId ? match.guest_id ?? match.host_id : match.host_id;
    await save({ ...match.state, call: calls, fingers: nums, turn: nextTurn, result }, result ? "finished" : "active");
  }

  async function drawLine(line: DotsLine) {
    if (!match || match.status !== "active" || !match.state.dots || match.state.dots.turn !== playerFor(match, myId) || isTaken(match.state.dots, line)) return;
    const played = playDots(match.state.dots, line);
    const score = dotsScore(played.state);
    const result = score.done ? score.p1 === score.p2 ? "draw" : score.p1 > score.p2 ? match.host_id : match.guest_id : undefined;
    await save({ ...match.state, dots: played.state, turn: played.state.turn === 1 ? match.host_id : match.guest_id, result }, result ? "finished" : "active");
  }

  const practice = !match && databaseError && fallback ? <div className="mt-4">{fallback}<p className="mt-3 rounded-2xl bg-care-soft p-3 text-xs text-care">Online play is waiting for the latest database migration. Practice mode is available below.</p></div> : null;
  return <section className="mt-5 rounded-[2rem] border border-border bg-card p-5 shadow-soft">
    <h3 className="heading-calm text-2xl">{match ? gameLabel(match.game) : "Invitations"}</h3>
    {invites.length > 0 && <div className="mt-3 space-y-2">{invites.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary p-3 text-sm"><span>{gameLabel(invite.game)} invitation</span><Button size="sm" variant="ink" onClick={() => void accept(invite)} disabled={busy}>Play</Button></div>)}</div>}
    {match?.status === "waiting" && <p className="mt-4 text-sm text-muted-foreground">Invitation sent — waiting for your Circle member.</p>}
    {match?.status === "active" && match.game === "ttt" && <div className="mt-4 space-y-4"><OnlineScoreboard players={players} match={match} /><p className="font-doodle text-lg">{winner ? winner === "draw" ? "It's a draw" : `${winner === (match.host_id === myId ? "X" : "O") ? "You win" : "Your friend wins"}!` : match.state.turn === myId ? "Your move" : "Their move"}</p><div className="relative mx-auto grid aspect-square w-full max-w-xs grid-cols-3 rounded-3xl bg-doodle-paper p-3 shadow-soft">{board.map((v, i) => <button key={i} onClick={() => void playTtt(i)} disabled={!!v || !!winner || match.state.turn !== myId} className={cn("flex items-center justify-center border-foreground/20", i % 3 !== 2 && "border-r-[3px]", i < 6 && "border-b-[3px]")}>{v === "X" && <svg viewBox="0 0 40 40" className="size-3/5 animate-pop"><path d="M8 8 L32 32 M32 8 L8 32" stroke="var(--doodle-red)" strokeWidth={6} strokeLinecap="round" /></svg>}{v === "O" && <svg viewBox="0 0 40 40" className="size-3/5 animate-pop"><circle cx={20} cy={20} r={13} fill="none" stroke="var(--doodle-blue)" strokeWidth={6} /></svg>}</button>)}</div></div>}
    {match?.status === "active" && match.game === "rps" && <div className="mt-4 space-y-4"><OnlineScoreboard players={players} match={match} /><p className="font-doodle text-lg">{match.state.result ? match.state.result === "draw" ? "Same hand — draw!" : match.state.result === myId ? "You win!" : "Your friend wins!" : match.state.turn === myId ? "Pick your hand" : "Waiting for your friend…"}</p><div className="flex items-center justify-center gap-8 rounded-3xl bg-doodle-paper py-8 text-6xl shadow-soft"><span className={cn(shaking && "animate-wiggle")}>{match.state.moves?.[myId] ? ({ rock: "✊", paper: "✋", scissors: "✌️" } as Record<string, string>)[match.state.moves[myId]!] : "✊"}</span><span className="font-doodle text-xl text-muted-foreground">vs</span><span className={cn("-scale-x-100", shaking && "animate-wiggle")}>{match.state.moves?.[match.host_id === myId ? match.guest_id ?? "" : match.host_id] ? ({ rock: "✊", paper: "✋", scissors: "✌️" } as Record<string, string>)[match.state.moves[match.host_id === myId ? match.guest_id ?? "" : match.host_id]!] : "✊"}</span></div><div className="grid grid-cols-3 gap-2">{(["rock", "paper", "scissors"] as RPS[]).map((h) => <button key={h} disabled={match.state.turn !== myId || !!match.state.moves?.[myId] || !!match.state.result} onClick={() => void throwRps(h)} className="rounded-2xl border-[3px] bg-card py-3 font-doodle text-lg capitalize"><span className="mr-1">{({ rock: "✊", paper: "✋", scissors: "✌️" } as Record<string, string>)[h]}</span>{h}</button>)}</div></div>}
    {match?.status === "active" && match.game === "oe" && <div className="mt-4 space-y-4"><OnlineScoreboard players={players} match={match} /><p className="font-doodle text-lg">{match.state.result ? match.state.result === "draw" ? "Tied!" : match.state.result === myId ? "You win!" : "Your friend wins!" : !match.state.call ? match.host_id === myId ? "Choose odds or evens." : "Waiting for the caller…" : match.state.turn === myId ? `Call: ${match.state.call}. Choose 1–5 fingers.` : "Waiting for your friend…"}</p>{!match.state.call && match.host_id === myId && <div className="grid grid-cols-2 gap-3"><Button variant="soft" onClick={() => void throwOdds("odds")}>Odds</Button><Button variant="soft" onClick={() => void throwOdds("evens")}>Evens</Button></div>}{match.state.call && <div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map((n) => <button key={n} disabled={match.state.turn !== myId || match.state.fingers?.[myId] != null || !!match.state.result} onClick={() => void throwOdds(undefined, n)} className="aspect-square rounded-2xl border-[3px] bg-card font-doodle text-2xl animate-pop">{n}</button>)}</div>}</div>}
    {match?.status === "active" && match.game === "dots" && match.state.dots && <div className="mt-4 space-y-4"><OnlineScoreboard players={players} match={match} /><p className="font-doodle text-lg">{match.state.result ? match.state.result === "draw" ? "Tied!" : match.state.result === myId ? "You win!" : "Your friend wins!" : match.state.dots.turn === playerFor(match, myId) ? "Your turn — draw a line" : "Their turn"}</p><DotsBoard state={match.state.dots} myTurn={match.state.dots.turn === playerFor(match, myId)} onLine={(line) => void drawLine(line)} /></div>}
    {match && match.status === "finished" && <p className="mt-4 rounded-2xl bg-secondary p-3 font-doodle">{match.state.result === "draw" ? "Tied game — recorded." : match.state.result === myId ? "Win recorded." : "Loss recorded."}</p>}
    {!match && !practice && invites.length === 0 && <p className="mt-1 text-sm text-muted-foreground">Choose a Circle member above, then tap a game to invite them.</p>}
    {practice}
  </section>;
}

function OnlineScoreboard({ players, match }: { players?: Players; match?: Match }) {
  if (!players) return null;
  const hostScore = match?.game === "dots" && match.state.dots ? dotsScore(match.state.dots).p1 : match?.state.result && match.state.result === match.host_id ? 1 : 0;
  const guestScore = match?.game === "dots" && match.state.dots ? dotsScore(match.state.dots).p2 : match?.state.result && match.state.result === match.guest_id ? 1 : 0;
  return <div className="flex items-end justify-between gap-4"><div className="flex items-end gap-2"><SonaFigure look={players.me.look} pose="stand" className="w-14" /><div><p className="text-xs text-muted-foreground">{players.me.name}</p><p className="font-doodle text-3xl text-doodle-blue">{match?.host_id ? hostScore : 0}</p></div></div><p className="font-doodle text-sm text-muted-foreground">vs</p><div className="flex items-end gap-2 text-right"><div><p className="text-xs text-muted-foreground">{players.them.name}</p><p className="font-doodle text-3xl text-doodle-red">{match?.guest_id ? guestScore : 0}</p></div><SonaFigure look={players.them.look} pose="stand" className="w-14" /></div></div>;
}

function DotsBoard({ state, myTurn, onLine }: { state: DotsState; myTurn: boolean; onLine: (line: DotsLine) => void }) {
  const G = state.rows; const SP = 60; const PAD = 20; const size = PAD * 2 + SP * G;
  return <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-xs rounded-3xl bg-doodle-paper shadow-soft">{state.boxes.map((row, r) => row.map((o, c) => o ? <rect key={`b${r}${c}`} x={PAD + c * SP + 4} y={PAD + r * SP + 4} width={SP - 8} height={SP - 8} rx={8} fill={o === 1 ? "var(--doodle-blue)" : "var(--doodle-red)"} opacity={0.22} className="animate-pop" /> : null))}{allLines(state).map((line) => { const x1 = PAD + line.c * SP; const y1 = PAD + line.r * SP; const x2 = line.kind === "h" ? x1 + SP : x1; const y2 = line.kind === "h" ? y1 : y1 + SP; const owner = line.kind === "h" ? state.h[line.r]![line.c] : state.v[line.r]![line.c]; return <g key={`${line.kind}${line.r}${line.c}`} onClick={() => myTurn && !owner && onLine(line)} className={cn(myTurn && !owner && "cursor-pointer")}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={16} /><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={owner === 1 ? "var(--doodle-blue)" : owner === 2 ? "var(--doodle-red)" : "transparent"} strokeWidth={6} strokeLinecap="round" /></g>; })}{Array.from({ length: G + 1 }, (_, r) => Array.from({ length: G + 1 }, (_, c) => <circle key={`d${r}${c}`} cx={PAD + c * SP} cy={PAD + r * SP} r={5.5} fill="var(--ink)" />))}</svg>;
}
