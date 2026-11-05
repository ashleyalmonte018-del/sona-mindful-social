import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Hand = "rock" | "paper" | "scissors";
type Match = { id: string; game: string; host_id: string; guest_id: string | null; state: { board?: ("X" | "O" | null)[]; turn?: string; winner?: string | null; moves?: Record<string, Hand>; result?: string }; status: string };

export function OnlineMatch({ myId, opponentId, game, onReady }: { myId: string; opponentId?: string; game?: "tic-tac-toe" | "rps"; onReady?: () => void }) {
  const [match, setMatch] = useState<Match | null>(null);
  const [busy, setBusy] = useState(false);
  const [invites, setInvites] = useState<Match[]>([]);
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

  useEffect(() => {
    if (!opponentId || !game || match) return;
    let active = true;
    const start = async () => {
      setBusy(true);
      try {
        const { data, error } = await supabase.from("match_sessions").insert({ game, host_id: myId, guest_id: opponentId, state: { board: Array(9).fill(null), turn: myId, winner: null, moves: {} } }).select("*").single();
        if (!active) return;
        if (error) toast.error(/match_sessions|schema cache|relation .* does not exist/i.test(error.message) ? "Games need one database update" : "Couldn't invite that Circle member", { description: error.message });
        else { setMatch(data as Match); onReady?.(); }
      } catch (error) {
        if (active) toast.error("Couldn't start that game", { description: error instanceof Error ? error.message : "Please try again." });
      } finally { if (active) setBusy(false); }
    };
    void start();
    return () => { active = false; };
  }, [game, myId, onReady, opponentId]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("match_sessions").select("*").eq("guest_id", myId).eq("status", "waiting").order("created_at", { ascending: false });
      setInvites((data ?? []) as Match[]);
    };
    void load();
    const channel = supabase.channel(`match-invites:${myId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "match_sessions", filter: `guest_id=eq.${myId}` }, (payload) => setInvites((old) => [payload.new as Match, ...old])).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [myId]);

  async function accept(invite: Match) {
    setBusy(true);
    const { error } = await supabase.from("match_sessions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", invite.id).eq("guest_id", myId);
    setBusy(false);
    if (error) toast.error("Couldn't accept the game", { description: error.message }); else { setInvites((old) => old.filter((m) => m.id !== invite.id)); setMatch({ ...invite, status: "active" }); }
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
    <h3 className="heading-calm text-2xl">Invitations</h3>
    {invites.length > 0 && <div className="mt-3 space-y-2">{invites.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary p-3 text-sm"><span>{invite.game === "rps" ? "Rock-Paper-Scissors" : "Tic-Tac-Toe"} invitation</span><Button size="sm" variant="ink" onClick={() => void accept(invite)} disabled={busy}>Play</Button></div>)}</div>}
    {match && <div className="mt-4">{match.status === "waiting" ? <p className="text-sm text-muted-foreground">Invitation sent — waiting for your Circle member.</p> : match.game === "rps" ? <><p className="text-sm">{match.state.result ? match.state.result === "draw" ? "Draw." : match.state.result === (match.host_id === myId ? "host" : "guest") ? "You win." : "Your friend wins." : "Choose your hand."}</p><div className="mt-3 flex gap-2">{(["rock", "paper", "scissors"] as Hand[]).map((h) => <Button key={h} variant="soft" onClick={() => void throwHand(h)} disabled={!!match.state.moves?.[myId] || match.status !== "active"}>{h}</Button>)}</div></> : <><p className="text-sm">{winner ? winner === "draw" ? "Draw." : `${winner === mark ? "You win" : "Your friend wins"}.` : match.state.turn === myId ? "Your turn." : "Their turn."}</p><div className="mt-3 grid max-w-xs grid-cols-3 overflow-hidden rounded-2xl border border-border">{board.map((v, i) => <button key={i} disabled={!!v || !!winner || match.state.turn !== myId} onClick={() => void play(i)} className={cn("aspect-square border border-border text-3xl font-doodle", v === "X" ? "text-doodle-red" : "text-doodle-blue")}>{v}</button>)}</div></>}</div>}
    {!match && invites.length === 0 && <p className="mt-1 text-sm text-muted-foreground">Choose a Circle member above, then tap a game to invite them.</p>}
  </section>;
}
