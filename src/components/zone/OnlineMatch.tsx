import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Hand = "rock" | "paper" | "scissors";
type Match = { id: string; game: string; host_id: string; guest_id: string | null; state: { board?: ("X" | "O" | null)[]; turn?: string; winner?: string | null; moves?: Record<string, Hand>; result?: string }; status: string };

export function OnlineMatch({ myId }: { myId: string }) {
  const [game, setGame] = useState<"tic-tac-toe" | "rps">("tic-tac-toe");
  const [match, setMatch] = useState<Match | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const board = match?.state.board ?? Array(9).fill(null);
  const mark = match?.host_id === myId ? "X" : "O";
  const winner = useMemo(() => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return lines.find(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]) ? board.find(Boolean) : board.every(Boolean) ? "draw" : null;
  }, [board]);

  useEffect(() => {
    if (!match) return;
    const channel = supabase.channel(`match:${match.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_sessions", filter: `id=eq.${match.id}` }, (payload) => setMatch(payload.new as Match)).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [match?.id]);

  async function create() {
    setBusy(true);
    const { data, error } = await supabase.from("match_sessions").insert({ game, host_id: myId, state: { board: Array(9).fill(null), turn: myId, winner: null } }).select("*").single();
    setBusy(false);
    if (error) toast.error("Couldn't start a match", { description: error.message }); else setMatch(data as Match);
  }
  async function join() {
    const id = code.trim();
    if (!id) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("join_match", { _match: id });
    setBusy(false);
    if (error) toast.error("Couldn't join that match", { description: error.message }); else setMatch(data as Match);
  }
  async function play(i: number) {
    if (!match || match.status !== "active" || winner || board[i] || match.state.turn !== myId) return;
    const next = [...board]; next[i] = mark;
    const nextWinner = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(([a,b,c]) => next[a] && next[a] === next[b] && next[a] === next[c]) ? mark : next.every(Boolean) ? "draw" : null;
    const state = { board: next, turn: match.guest_id === myId ? match.host_id : match.guest_id, winner: nextWinner };
    const { error } = await supabase.from("match_sessions").update({ state, status: nextWinner ? "finished" : "active", updated_at: new Date().toISOString() }).eq("id", match.id);
    if (error) toast.error("That move didn't go through");
  }

  async function throwHand(hand: Hand) {
    if (!match || match.status !== "active") return;
    const moves = { ...(match.state.moves ?? {}), [myId]: hand };
    const other = Object.entries(moves).find(([id]) => id !== myId)?.[1];
    const result = other ? hand === other ? "draw" : (hand === "rock" && other === "scissors") || (hand === "paper" && other === "rock") || (hand === "scissors" && other === "paper") ? (match.host_id === myId ? "host" : "guest") : (match.host_id === myId ? "guest" : "host") : undefined;
    const { error } = await supabase.from("match_sessions").update({ state: { ...match.state, moves, result }, status: result ? "finished" : "active", updated_at: new Date().toISOString() }).eq("id", match.id);
    if (error) toast.error("That throw didn't go through");
  }

  return <section className="mt-5 rounded-[2rem] border border-border bg-card p-5 shadow-soft">
    <h3 className="heading-calm text-2xl">Play across devices</h3>
    {!match ? <>
      <p className="mt-1 text-sm text-muted-foreground">Start a real match with a Circle member. Moves sync live between devices.</p>
      <div className="mt-3 flex flex-wrap gap-2"><select value={game} onChange={(e) => setGame(e.target.value as typeof game)} className="rounded-full border border-border bg-background px-3 text-sm"><option value="tic-tac-toe">Tic-Tac-Toe</option><option value="rps">Rock-Paper-Scissors</option></select><Button variant="ink" onClick={() => void create()} disabled={busy}>Create match</Button></div>
      <div className="mt-3 flex gap-2"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste match ID" className="rounded-full" /><Button variant="soft" onClick={() => void join()} disabled={busy || !code.trim()}>Join</Button></div>
    </> : <>
      <p className="mt-1 text-xs text-muted-foreground">Match ID: <button className="underline" onClick={() => { void navigator.clipboard?.writeText(match.id); setCopied(true); }}>{match.id}</button>{copied ? " · copied" : " · send this to your friend"}</p>
      {match.status === "waiting" ? <p className="mt-4 text-sm">Waiting for your Circle member to join…</p> : match.game === "rps" ? <><p className="mt-3 text-sm">{match.state.result ? match.state.result === "draw" ? "Draw." : match.state.result === (match.host_id === myId ? "host" : "guest") ? "You win." : "Your friend wins." : "Choose your hand — the match resolves when both players throw."}</p><div className="mt-3 flex gap-2">{(["rock", "paper", "scissors"] as Hand[]).map((h) => <Button key={h} variant="soft" onClick={() => void throwHand(h)} disabled={!!match.state.moves?.[myId] || match.status !== "active"}>{h}</Button>)}</div></> : <><p className="mt-3 text-sm">{winner ? winner === "draw" ? "Draw." : `${winner === mark ? "You win" : "Your friend wins"}.` : match.state.turn === myId ? "Your turn." : "Their turn — you'll be notified when they move."}</p><div className="mt-3 grid max-w-xs grid-cols-3 overflow-hidden rounded-2xl border border-border">{board.map((v, i) => <button key={i} disabled={!!v || !!winner || match.state.turn !== myId} onClick={() => void play(i)} className={cn("aspect-square border border-border text-3xl font-doodle", v === "X" ? "text-doodle-red" : "text-doodle-blue")}>{v}</button>)}</div></>}
    </>}
  </section>;
}
