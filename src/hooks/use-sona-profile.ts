import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  mergeLook,
  mergeSettings,
  parseDoodle,
  type AgeMode,
  type CareCondition,
  type DoodleStroke,
  type MoodId,
  type SonaLook,
  type SonaSettings,
} from "@/lib/sona/types";

export interface SonaProfile {
  id: string;
  email: string | null;
  displayName: string;
  handle: string | null;
  ageMode: AgeMode;
  care: CareCondition[];
  settings: SonaSettings;
  look: SonaLook;
  doodle: DoodleStroke[];
}

const PROFILE_KEY = ["profile"] as const;

async function fetchProfile(): Promise<SonaProfile> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) throw new Error("Not signed in");
  const user = auth.user;
  let { data: row, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (!row) {
    const name = (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "friend";
    const ins = await supabase.from("profiles").insert({ id: user.id, display_name: name }).select("*").single();
    if (ins.error) throw ins.error;
    row = ins.data;
  }
  return {
    id: row.id,
    email: user.email ?? null,
    displayName: row.display_name,
    handle: row.handle,
    ageMode: (row.age_mode as AgeMode) ?? "bloom",
    care: (row.care_profile ?? []) as CareCondition[],
    settings: mergeSettings(row.settings),
    look: mergeLook(row.sona),
    doodle: parseDoodle(row.doodle),
  };
}

type Patch = Partial<Pick<SonaProfile, "displayName" | "handle" | "ageMode" | "care" | "look" | "doodle">> & {
  settings?: Partial<SonaSettings>;
};

function toRow(p: SonaProfile, patch: Patch) {
  const row: Record<string, unknown> = {};
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.handle !== undefined) row.handle = patch.handle;
  if (patch.ageMode !== undefined) row.age_mode = patch.ageMode;
  if (patch.care !== undefined) row.care_profile = patch.care;
  if (patch.settings !== undefined) row.settings = p.settings as unknown as Json;
  if (patch.look !== undefined) row.sona = p.look as unknown as Json;
  if (patch.doodle !== undefined) row.doodle = JSON.stringify(p.doodle);
  return row;
}

function applyPatch(p: SonaProfile, patch: Patch): SonaProfile {
  return {
    ...p,
    ...patch,
    settings: patch.settings ? mergeSettings({ ...p.settings, ...patch.settings }) : p.settings,
    look: patch.look ? mergeLook({ ...p.look, ...patch.look }) : p.look,
  } as SonaProfile;
}

export function useSonaProfile() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: PROFILE_KEY, queryFn: fetchProfile, staleTime: 60_000, retry: 1 });
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    const current = qc.getQueryData<SonaProfile>(PROFILE_KEY);
    if (!current) return;
    const { error } = await supabase.from("profiles").update(toRow(current, patch)).eq("id", current.id);
    if (error) {
      toast.error("Couldn't save that change", { description: error.message });
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
    }
  }, [qc]);

  /** Optimistic update; network write is debounced so dials and toggles feel instant. */
  const update = useCallback(
    (patch: Patch, opts?: { immediate?: boolean }) => {
      const current = qc.getQueryData<SonaProfile>(PROFILE_KEY);
      if (!current) return Promise.resolve();
      qc.setQueryData(PROFILE_KEY, applyPatch(current, patch));
      pending.current = {
        ...pending.current,
        ...patch,
        settings: patch.settings || pending.current.settings ? { ...pending.current.settings, ...patch.settings } : undefined,
      };
      if (timer.current) clearTimeout(timer.current);
      if (opts?.immediate) return flush();
      timer.current = setTimeout(flush, 450);
      return Promise.resolve();
    },
    [qc, flush],
  );

  return { ...query, profile: query.data, update };
}

// ---------- Mood check-ins ----------

export interface MoodRow {
  id: string;
  mood: string;
  source: string;
  note: string | null;
  created_at: string;
}

export function useMoods() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["moods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_checkins")
        .select("id,mood,source,note,created_at")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as MoodRow[];
    },
  });
  const log = useMutation({
    mutationFn: async (v: { mood: MoodId; source: string; note?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("mood_checkins")
        .insert({ user_id: auth.user.id, mood: v.mood, source: v.source, note: v.note ?? null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moods"] }),
    onError: (e: Error) => toast.error("Couldn't save your check-in", { description: e.message }),
  });
  const today = new Date().toDateString();
  const checkedInToday = (query.data ?? []).some((m) => new Date(m.created_at).toDateString() === today);
  return { ...query, moods: query.data ?? [], log, checkedInToday };
}

// ---------- Journal ----------

export interface JournalRow {
  id: string;
  kind: string;
  original: string | null;
  reframe: string | null;
  rating: number | null;
  created_at: string;
}

export function useJournal() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id,kind,original,reframe,rating,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as JournalRow[];
    },
  });
  const add = useMutation({
    mutationFn: async (v: { kind: string; original?: string; reframe?: string; rating?: number }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("journal_entries").insert({ user_id: auth.user.id, ...v });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal"] }),
    onError: (e: Error) => toast.error("Couldn't save that", { description: e.message }),
  });
  return { ...query, entries: query.data ?? [], add };
}
