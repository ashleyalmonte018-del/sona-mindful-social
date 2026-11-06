import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { tiersByMember, type TierId } from "@/lib/sona/tiers";
import { mergeLook, MOODS, type MoodId, type SonaLook } from "@/lib/sona/types";

export interface CircleMember {
  id: string;
  name: string;
  handle: string | null;
  look: SonaLook;
  song: string | null;
  artist: string | null;
  mood: MoodId | null;
  quiet: boolean;
  allowsPlay: boolean;
  avatarPath: string | null;
  /** Kept for older game interfaces; members are always real accounts. */
  sample: boolean;
}

const asMood = (m: string | null): MoodId | null => (MOODS.some((x) => x.id === m) ? (m as MoodId) : null);


/** Your circle (mutual follows) with their Sonas and what they chose to share. */
export function useCircleMembers() {
  return useQuery({
    queryKey: ["circle-members"],
    staleTime: 60_000,
    queryFn: async (): Promise<CircleMember[]> => {
      const { data, error } = await supabase.rpc("circle_sonas");
      if (error) throw error;
      return (data ?? []).map((r) => {
        const look = mergeLook(r.sona);
        return {
          id: r.id,
          name: r.display_name,
          handle: r.handle,
          look: { ...look, name: look.name || r.display_name },
          song: r.song,
          artist: r.artist,
          mood: asMood(r.mood),
          quiet: r.quiet,
          allowsPlay: r.allows_play,
          avatarPath: r.avatar_path,
          sample: false,
        };
      });
    },
  });
}

export function useCircleTiers(myId: string) {
  const qc = useQueryClient();
  const key = ["circle-tiers", myId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(myId),
    queryFn: async () => {
      const { data, error } = await supabase.from("circle_tier_members").select("member_id,tier").eq("owner_id", myId);
      if (error) throw error;
      return tiersByMember(data ?? []);
    },
  });

  const toggle = useMutation({
    mutationFn: async (v: { memberId: string; tier: TierId; on: boolean }) => {
      if (v.on) {
        const { error } = await supabase.from("circle_tier_members").insert({ owner_id: myId, member_id: v.memberId, tier: v.tier });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase.from("circle_tier_members").delete().eq("owner_id", myId).eq("member_id", v.memberId).eq("tier", v.tier);
        if (error) throw error;
      }
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Record<string, TierId[]>>(key);
      const next = { ...(prev ?? {}) };
      const list = new Set(next[v.memberId] ?? []);
      if (v.on) list.add(v.tier);
      else list.delete(v.tier);
      next[v.memberId] = [...list];
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (e: Error) => {
      void qc.invalidateQueries({ queryKey: key });
      toast.error("Couldn't update that tier", { description: e.message });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, byMember: query.data ?? {}, toggle };
}
