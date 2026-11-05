import { Globe, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";

import { FollowersDialog } from "@/components/social/FollowersDialog";
import { PersonAvatar } from "@/components/social/Avatar";

import { useSignedUrl } from "@/hooks/use-social";
import type { Json } from "@/integrations/supabase/types";
import { PRIVATE_HIDES, type PrivateHides } from "@/lib/sona/social";

export function ProfileHeader({
  name,
  handle,
  bio,
  avatarPath,
  bannerPath,
  accent,
  sona,
  followers,
  following,
  postCount,
  isPublic,
  hides,
  children,
}: {
  name: string;
  handle: string | null;
  bio: string | null;
  avatarPath: string | null;
  bannerPath: string | null;
  accent: string;
  sona: Json | null;
  followers: number | null;
  following: number | null;
  postCount: number | null;
  isPublic: boolean;
  hides: PrivateHides | null;
  children?: ReactNode;
}) {
  const banner = useSignedUrl("profile-media", bannerPath);
  return (
    <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
      <div
        className="relative h-36 md:h-52"
        // Accent colour is the person's own choice, so it's applied as data rather than a theme token.
        style={{ background: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 30%, var(--card)))` }}
      >
        {bannerPath && banner.data && <img src={banner.data} alt="" className="absolute inset-0 size-full object-cover" />}
      </div>
      <div className="px-6 pb-6 md:px-8">
        {/* relative + z-10 so the picture bubble sits on the layer above the (positioned) banner. */}
        <div className="relative z-10 -mt-12 flex flex-wrap items-end justify-between gap-4">
          <div className="rounded-full p-1" style={{ background: accent }}>
            <PersonAvatar path={avatarPath} sona={sona} name={name} className="size-24 border-4 border-card md:size-28" />
          </div>
          <div className="flex flex-wrap gap-2 pb-1">{children}</div>
        </div>
        <h1 className="heading-calm mt-4 text-4xl md:text-5xl">{name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {handle && <span>@{handle}</span>}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
            {isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
            {isPublic ? "Public" : `Private · hides ${PRIVATE_HIDES.find((h) => h.id === hides)?.label.toLowerCase() ?? "everything"}`}
          </span>
        </p>
        {bio ? <p className="mt-3 max-w-2xl whitespace-pre-wrap text-base">{bio}</p> : null}
        <dl className="mt-4 flex flex-wrap gap-5 text-sm">
          {followers === null ? (
            <div className="text-muted-foreground">Follower count hidden</div>
          ) : (
            <>
              <div>
                <dd className="inline font-medium">{followers}</dd> <dt className="inline text-muted-foreground">followers</dt>
              </div>
              <div>
                <dd className="inline font-medium">{following ?? 0}</dd> <dt className="inline text-muted-foreground">following</dt>
              </div>
            </>
          )}
          {postCount !== null && (
            <div>
              <dd className="inline font-medium">{postCount}</dd> <dt className="inline text-muted-foreground">posts</dt>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}
