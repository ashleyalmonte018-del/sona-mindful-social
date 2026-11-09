import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type LiveGame = "ttt" | "rps";
export type MatchStatus = "waiting" | "active" | "done" | "cancelled";

export interface TttState {
  board: ("X" | "O" | null)[];
  turn: string;
  winner: "X" | "O" | "draw" | null;
}
export interface RpsRound {
  host: string;
  guest: string;
  result: "host" | "guest" | "draw";
}
export interface RpsState {
  round: number;
  picked: string[];
  history: RpsRound[];
  host: number;
  guest: number;
  target: number;
  winner: "host" | "guest" | null;
}

export interface Match {
  id: string;
  game: LiveGame;
  hostId: string;
  guestId: string;
  status: MatchStatus;
  state: TttState | RpsState;
  updatedAt: string;
}

type Row = { id: string; game: string; host_id: string; guest_id: string | null; status: string; state: unknown; updated_at: string };
const toMatch = (r: Row): Match => ({
  id: r.id,
  game: r.game === "rps" ? "rps" : "ttt",
  hostId: r.host_id,
  guestId: r.guest_id ?? "",
  status: (["waiting", "active", "done", "cancelled"].includes(r.status) ? r.status : "waiting") as MatchStatus,
  state: (r.state ?? {}) as TttState | RpsState,
  updatedAt: r.updated_at,
});


/** Whose move is it? Pure so it can be tested. */
export function isMyTurn(m: Match, me: string): boolean {
  if (m.status !== "waiting" && m.status !== "active") return false;
  if (!m.state) return false;
  if (m.game === "ttt") {
    return (m.state as Partial<TttState>)?.turn === me;
  }
  const picked = (m.state as Partial<RpsState>)?.picked;
  return Array.isArray(picked) ? !picked.includes(me) : false;
}


export function useMatch(id: string | null) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["match", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("match_sessions").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data ? toMatch(data) : null;
    },
  });
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`match-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_sessions", filter: `id=eq.${id}` }, (payload) => {
        qc.setQueryData(["match", id], toMatch(payload.new as Row));
        qc.invalidateQueries({ queryKey: ["my-matches"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);
  return q;
}

export function useMyMatches(myId: string) {
  return useQuery({
    queryKey: ["my-matches", myId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_sessions")
        .select("*")
        .in("status", ["waiting", "active"])
        .or(`host_id.eq.${myId},guest_id.eq.${myId}`)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map(toMatch);
    },
  });
}

export function useMatchActions() {
  const qc = useQueryClient();
  const onError = (e: Error) => toast.error(e.message);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-matches"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const create = useMutation({
    mutationFn: async ({ game, guest }: { game: LiveGame; guest: string }) => {
      const { data, error } = await supabase.rpc("create_match", { _game: game, _guest: guest });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success("Invite sent — they'll get a ping");
      refresh();
    },
    onError,
  });
  const join = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("join_match", { _match: id });
      if (error) throw error;
    },
    onSuccess: refresh,
    onError,
  });
  const decline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("decline_match", { _match: id });
      if (error) throw error;
    },
    onSuccess: refresh,
    onError,
  });
  const move = useMutation({
    mutationFn: async ({ id, move }: { id: string; move: string }) => {
      const { error } = await supabase.rpc("match_move", { _match: id, _move: move });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["match", id] });
      refresh();
    },
    onError,
  });
  return { create, join, decline, move };
}

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  matchId: string | null;
  postId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Your pings (game invites, your-turn, shared posts), kept live. */
export function useNotifications(myId: string | undefined, onNew?: (n: AppNotification) => void) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications", myId],
    enabled: Boolean(myId),
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,kind,title,body,match_id,post_id,read_at,created_at")
        .eq("recipient_id", myId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        matchId: n.match_id,
        postId: n.post_id,
        readAt: n.read_at,
        createdAt: n.created_at,
      }));
    },
  });
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`notes-${myId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${myId}` }, (payload) => {
        const n = payload.new as { id: string; kind: string; title: string; body: string; match_id: string | null; post_id: string | null; read_at: string | null; created_at: string };
        qc.invalidateQueries({ queryKey: ["notifications", myId] });
        qc.invalidateQueries({ queryKey: ["my-matches"] });
        onNew?.({ id: n.id, kind: n.kind, title: n.title, body: n.body, matchId: n.match_id, postId: n.post_id, readAt: n.read_at, createdAt: n.created_at });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, qc]);
  return q;
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
}
