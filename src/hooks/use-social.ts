import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toUserPost, type PrivateHides, type UserPost } from "@/lib/sona/social";

export type FollowStatus = "pending" | "approved";

export interface ProfileCard {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_path: string | null;
  sona: Json;
  is_public: boolean;
  private_hides: PrivateHides | null;
  bio: string | null;
  banner_path: string | null;
  accent_color: string;
  followers: number | null;
  following: number | null;
  posts_visible: boolean;
  my_follow: FollowStatus | null;
  follows_me: FollowStatus | null;
  is_me: boolean;
}

export interface PersonCard {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_path: string | null;
  accent_color?: string | null;
}

export function useProfileCard(id: string | undefined) {
  return useQuery({
    queryKey: ["profile-card", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("profile_card", { _id: id! });
      if (error) throw error;
      return (data ?? null) as unknown as ProfileCard | null;
    },
  });
}

export function usePostsBy(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["posts-by", userId],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_posts")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []).map(toUserPost);
    },
  });
}

/** Public Feed: the database drops private accounts unless you're an approved follower. */
export function usePublicFeed(limit = 15) {
  return useQuery({
    queryKey: ["feed-public", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_feed_posts", { _limit: limit });
      if (error) throw error;
      return (data ?? []).map(toUserPost);
    },
  });
}

/** Circle feed: only friends' Circle posts are readable, so the database does the filtering. */
export function useCircleFeed(myId: string, limit = 15) {
  return useQuery({
    queryKey: ["feed-circle", myId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_posts")
        .select("*")
        .eq("audience", "circle")
        .neq("user_id", myId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(toUserPost);
    },
  });
}

export function usePeopleCards(ids: string[]) {
  const unique = Array.from(new Set(ids)).sort();
  return useQuery({
    queryKey: ["people-cards", unique],
    enabled: unique.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("people_cards", { _ids: unique });
      if (error) throw error;
      const map: Record<string, PersonCard> = {};
      for (const p of data ?? []) map[p.id] = p;
      return map;
    },
  });
}

export function useSearchPeople(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ["search-people", term],
    enabled: term.length >= 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_profiles", { _q: term });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface FollowRequest {
  id: string;
  followerId: string;
  createdAt: string;
  person: PersonCard | undefined;
}

export function useFollowRequests(myId: string | undefined, opts?: { poll?: boolean }) {
  return useQuery({
    queryKey: ["follow-requests", myId],
    enabled: Boolean(myId),
    refetchInterval: opts?.poll ? 60_000 : false,
    queryFn: async (): Promise<FollowRequest[]> => {
      const { data, error } = await supabase
        .from("follows")
        .select("id,follower_id,created_at")
        .eq("following_id", myId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const cards = await supabase.rpc("people_cards", { _ids: rows.map((r) => r.follower_id) });
      const byId = new Map((cards.data ?? []).map((c) => [c.id, c]));
      return rows.map((r) => ({ id: r.id, followerId: r.follower_id, createdAt: r.created_at, person: byId.get(r.follower_id) }));
    },
  });
}

export function useFollowActions(myId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['circle-members'] });
    qc.invalidateQueries({ queryKey: ['circle-tiers'] });
    qc.invalidateQueries({ queryKey: ["profile-card"] });
    qc.invalidateQueries({ queryKey: ["follow-requests"] });
    qc.invalidateQueries({ queryKey: ["posts-by"] });
    qc.invalidateQueries({ queryKey: ["feed-public"] });
    qc.invalidateQueries({ queryKey: ["feed-circle"] });
  };
  const onError = (e: Error) => toast.error("That didn't go through", { description: e.message });

  const follow = useMutation({
    mutationFn: async (targetId: string) => {
      const { data, error } = await supabase.from("follows").insert({ follower_id: myId, following_id: targetId }).select("status").single();
      if (error) throw error;
      return data.status as FollowStatus;
    },
    onSuccess: (status) => {
      toast.success(status === "pending" ? "Request sent — they'll need to approve it" : "Following");
      refresh();
    },
    onError,
  });
  const unfollow = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", targetId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError,
  });
  const approve = useMutation({
    mutationFn: async (followId: string) => {
      const { error } = await supabase.from("follows").update({ status: "approved" }).eq("id", followId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approved");
      refresh();
    },
    onError,
  });
  const decline = useMutation({
    mutationFn: async (followId: string) => {
      const { error } = await supabase.from("follows").delete().eq("id", followId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError,
  });
  return { follow, unfollow, approve, decline };
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: UserPost) => {
      const { error } = await supabase.from("user_posts").delete().eq("id", post.id);
      if (error) throw error;
      if (post.mediaPath) await supabase.storage.from("post-media").remove([post.mediaPath]);
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["posts-by"] });
      qc.invalidateQueries({ queryKey: ["feed-public"] });
      qc.invalidateQueries({ queryKey: ["feed-circle"] });
    },
    onError: (e: Error) => toast.error("Couldn't delete that", { description: e.message }),
  });
}

export function useSharePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.rpc("share_post", { _post: postId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shared with your Circle — the original audience still applies");
      qc.invalidateQueries({ queryKey: ['feed-shared'] });
      qc.invalidateQueries({ queryKey: ["feed-public"] });
      qc.invalidateQueries({ queryKey: ["feed-circle"] });
      qc.invalidateQueries({ queryKey: ["posts-by"] });
    },
    onError: (e: Error) => toast.error("Couldn't share that", { description: e.message }),
  });
}

export function useSharedFeed() {
  return useQuery({ queryKey: ['feed-shared'], queryFn: async () => {
    const { data, error } = await supabase.rpc('shared_feed_posts', { _limit: 15 });
    if (error) throw error;
    return (data ?? []).map(toUserPost);
  } });
}

export async function copyPostLink(postId: string) {
  const { data, error } = await supabase.rpc('public_post_link', { _post: postId });
  if (error) throw error;
  if (!data) throw new Error('Only shareable Public Feed posts from public accounts have a public link.');
  await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
}

/** Private buckets: everything is served through short-lived signed links. */
export function useSignedUrl(bucket: "post-media" | "profile-media" | "chat-backgrounds", path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed", bucket, path],
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export async function uploadMedia(bucket: "post-media" | "profile-media" | "chat-backgrounds", userId: string, body: Blob, ext: string) {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, { upsert: false, ...(body.type ? { contentType: body.type } : {}) });
  if (error) throw error;
  return path;
}

export const fileExt = (f: File, fallback: string) => {
  const fromName = f.name.split(".").pop()?.toLowerCase();
  return fromName && /^[a-z0-9]{2,5}$/.test(fromName) ? fromName : fallback;
};
export function useFollowers(ownerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["followers-list", ownerId],
    enabled: Boolean(ownerId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("followers_list", { _owner: ownerId! });
      if (error) throw error;
      return data ?? [];
    },
  });
}
