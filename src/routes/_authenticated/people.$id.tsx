import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Lock, UserCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { Gallery } from "@/components/social/Gallery";
import { ProfileHeader } from "@/components/social/ProfileHeader";
import { useFollowActions, usePostsBy, useProfileCard } from "@/hooks/use-social";

export const Route = createFileRoute("/_authenticated/people/$id")({
  head: () => ({
    meta: [
      { title: "Profile — Sona" },
      { name: "description", content: "Someone's Sona profile and gallery." },
      { property: "og:title", content: "Profile — Sona" },
      { property: "og:description", content: "A Sona profile and gallery." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Person />
    </AppShell>
  ),
});

function Person() {
  const { id } = Route.useParams();
  const { profile } = useSona();
  const card = useProfileCard(id);
  const c = card.data;
  const posts = usePostsBy(id, Boolean(c?.posts_visible));
  const { follow, unfollow } = useFollowActions(profile.id);

  if (id === profile.id) return <Navigate to="/profile" />;
  if (card.isLoading) return <p className="subline py-20 text-center">Opening their profile…</p>;
  if (!c) return <p className="subline py-20 text-center">That profile doesn't exist.</p>;

  const busy = follow.isPending || unfollow.isPending;
  const followButton =
    c.my_follow === "approved" ? (
      <Button variant="soft" disabled={busy} onClick={() => unfollow.mutate(id)}>
        <UserCheck /> Following
      </Button>
    ) : c.my_follow === "pending" ? (
      <Button variant="soft" disabled={busy} onClick={() => unfollow.mutate(id)} title="Cancel request">
        Requested
      </Button>
    ) : (
      <Button variant="ink" disabled={busy} onClick={() => follow.mutate(id)}>
        <UserPlus /> {c.is_public ? "Follow" : "Request to follow"}
      </Button>
    );

  const list = posts.data ?? [];
  return (
    <div className="space-y-6">
      <ProfileHeader
        name={c.display_name}
        handle={c.handle}
        bio={c.bio}
        avatarPath={c.avatar_path}
        bannerPath={c.banner_path}
        accent={c.accent_color}
        sona={c.sona}
        followers={c.followers}
        following={c.following}
        postCount={c.posts_visible ? list.length : null}
        isPublic={c.is_public}
        hides={c.private_hides}
      >
        {followButton}
      </ProfileHeader>

      {c.follows_me === "pending" && (
        <p className="rounded-2xl bg-lime-soft px-4 py-3 text-sm">
          {c.display_name} asked to follow you.{" "}
          <Link to="/profile" className="underline underline-offset-4">
            Review requests
          </Link>
        </p>
      )}

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
        <h2 className="heading-calm text-3xl">Gallery</h2>
        {!c.posts_visible ? (
          <div className="mt-4 flex flex-col items-center rounded-[1.5rem] border border-dashed border-border px-6 py-12 text-center">
            <Lock className="size-6 text-muted-foreground" />
            <p className="mt-2 font-medium">This account is private</p>
            <p className="subline text-sm">{c.my_follow === "pending" ? "Your request is waiting for approval." : "Follow them — once they approve, their posts show here."}</p>
          </div>
        ) : list.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No posts to show yet.</p>
        ) : (
          <div className="mt-4">
            <Gallery posts={list} author={{ id: c.id, display_name: c.display_name, handle: c.handle, avatar_path: c.avatar_path }} labelStyle={profile.settings.labelStyle} />
          </div>
        )}
      </section>
    </div>
  );
}
