import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import type { Players } from "@/components/zone/Games";
import { isMyTurn, useMatch, useMatchActions, type Match, type RpsState, type TttState } from "@/hooks/use-matches";
import { cn } from "@/lib/utils";

const RPS_ICON: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

/** A real two-player match: state lives in the database and updates live on both devices. */
export function LiveMatch({ matchId, myId, players }: { matchId: string; myId: string; players: Players }) {
  const q = useMatch(matchId);
  const { move, join, decline } = useMatchActions();
  const m = q.data;
  if (q.isLoading) return <div className="h-64 animate-pulse rounded-[1.5rem] bg-secondary" />;
  if (!m) return <p className="text-sm text-muted-foreground">This match isn't available.</p>;

  const iAmHost = m.hostId === myId;
  const myTurn = isMyTurn(m, myId);
  const over = m.status === "done" || m.status === "cancelled";

  if (m.status === "waiting" && !iAmHost) {
    return (
      <div className="space-y-4 text-center">
        <SonaFigure look={players.them.look} pose="wave" className="mx-auto w-20" />
        <p className="text-sm">{players.them.name} invited you to play.</p>
        <div className="flex justify-center gap-2">
          <Button variant="ink" onClick={() => join.mutate(m.id)} disabled={join.isPending}>Play</Button>
          <Button variant="soft" onClick={() => decline.mutate(m.id)}>Not now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-2">
          <SonaFigure look={players.me.look} pose={myTurn ? "think" : "stand"} className="w-12" />
          <span className="text-xs text-muted-foreground">You</span>
        </div>
        <p aria-live="polite" className="text-center text-sm font-medium">{statusLine(m, myId, players.them.name)}</p>
        <div className="flex items-end gap-2">
          <span className="text-xs text-muted-foreground">{players.them.name}</span>
          <SonaFigure look={players.them.look} pose={!myTurn && !over ? "think" : "stand"} className="w-12" />
        </div>
      </div>

      {m.game === "ttt" ? (
        <TttBoard state={m.state as TttState} disabled={!myTurn || over || move.isPending} onPlay={(i) => move.mutate({ id: m.id, move: String(i) })} />
      ) : (
        <RpsBoard state={m.state as RpsState} iAmHost={iAmHost} disabled={!myTurn || over || move.isPending} onPick={(p) => move.mutate({ id: m.id, move: p })} />
      )}

      {!over && (
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => decline.mutate(m.id)}>
          End match
        </Button>
      )}
    </div>
  );
}

function statusLine(m: Match, me: string, them: string) {
  if (m.status === "cancelled") return "Match ended";
  const iAmHost = m.hostId === me;
  if (m.game === "ttt") {
    const s = m.state as TttState;
    if (s.winner === "draw") return "A draw!";
    if (s.winner) return (s.winner === "X") === iAmHost ? "You won!" : `${them} won`;
  } else {
    const s = m.state as RpsState;
    if (s.winner) return (s.winner === "host") === iAmHost ? "You won!" : `${them} won`;
  }
  if (m.status === "waiting") return `Waiting for ${them} to join…`;
  return isMyTurn(m, me) ? "Your move" : `Waiting for ${them}…`;
}

function TttBoard({ state, disabled, onPlay }: { state: TttState; disabled: boolean; onPlay: (i: number) => void }) {
  return (
    <div className="mx-auto grid w-64 grid-cols-3 gap-2">
      {state.board.map((c, i) => (
        <button
          key={i}
          aria-label={c ? `Square ${i + 1}: ${c}` : `Square ${i + 1}`}
          disabled={disabled || !!c}
          onClick={() => onPlay(i)}
          className={cn("font-doodle aspect-square rounded-2xl border-2 border-border bg-doodle-paper text-4xl transition", !c && !disabled && "hover:border-foreground/40")}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function RpsBoard({ state, iAmHost, disabled, onPick }: { state: RpsState; iAmHost: boolean; disabled: boolean; onPick: (p: string) => void }) {
  const mine = iAmHost ? state.host : state.guest;
  const theirs = iAmHost ? state.guest : state.host;
  const last = state.history[state.history.length - 1];
  return (
    <div className="space-y-4 text-center">
      <p className="font-doodle text-3xl">{mine} – {theirs}</p>
      <p className="text-xs text-muted-foreground">First to {state.target}. Picks stay hidden until you've both chosen.</p>
      {last && (
        <p className="text-sm">
          Last round: you {RPS_ICON[iAmHost ? last.host : last.guest]} vs {RPS_ICON[iAmHost ? last.guest : last.host]} —{" "}
          {last.result === "draw" ? "draw" : (last.result === "host") === iAmHost ? "you took it" : "they took it"}
        </p>
      )}
      <div className="flex justify-center gap-3">
        {(["rock", "paper", "scissors"] as const).map((p) => (
          <button key={p} disabled={disabled} onClick={() => onPick(p)} aria-label={p} className="rounded-2xl border-2 border-border bg-doodle-paper px-4 py-3 text-3xl transition hover:border-foreground/40 disabled:opacity-40">
            {RPS_ICON[p]}
          </button>
        ))}
      </div>
    </div>
  );
}
