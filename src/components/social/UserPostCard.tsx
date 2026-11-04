import { Link } from "@tanstack/react-router";
import { AlertTriangle, BadgeInfo, Eye, Globe, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/social/Avatar";
import { SeeWhyDialog } from "@/components/social/SeeWhyDialog";
import { useDeletePost, useSignedUrl, type PersonCard } from "@/hooks/use-social";
import { disclosureChips, triggerLabel, type LabelStyle, type UserPost } from "@/lib/sona/social";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function PostMedia({ post, className, controls = true }: { post: UserPost; className?: string; controls?: boolean }) {
  const url = useSignedUrl("post-media", post.mediaPath);
  const vid = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const pause = () => vid.current?.pause();
    window.addEventListener("sona:pause", pause);
    return () => window.removeEventListener("sona:pause", pause);
  }, []);
  if (post.mediaType === "text" || !post.mediaPath) return null;
  if (!url.data) return <div className={cn("aspect-[4/5] w-full animate-pulse rounded-2xl bg-secondary", className)} />;
  return post.mediaType === "video" ? (
    // Tap to play only — nothing autoplays on Sona.
    <video ref={vid} src={url.data} controls={controls} preload="metadata" playsInline className={cn("w-full rounded-2xl bg-ink", className)} />
  ) : (
    <img src={url.data} alt={post.body ? post.body.slice(0, 120) : "Photo post"} className={cn("w-full rounded-2xl object-cover", className)} />
  );
}

export function UserPostCard({
  post,
  author,
  labelStyle,
  isMine,
}: {
  post: UserPost;
  author: PersonCard | undefined;
  labelStyle: LabelStyle;
  isMine?: boolean;
}) {
  const [why, setWhy] = useState(false);
  const loud = labelStyle === "loud" && post.labels.length > 0;
  const [revealed, setRevealed] = useState(!loud);
  const del = useDeletePost();
  const chips = disclosureChips(post.disclosures);
  const name = author?.display_name ?? "Someone";

  return (
    <article className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft md:p-6">
      <header className="flex items-center gap-3">
        <Link to={isMine ? "/profile" : "/people/$id"} params={{ id: post.userId }} className="flex min-w-0 flex-1 items-center gap-3">
          <PersonAvatar path={author?.avatar_path} name={name} className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {author?.handle ? `@${author.handle} · ` : ""}
              {timeAgo(post.createdAt)} ·{" "}
              {post.audience === "circle" ? <Users className="size-3" aria-label="Circle" /> : <Globe className="size-3" aria-label="Public Feed" />}
            </p>
          </div>
        </Link>
        {isMine && (
          <Button size="icon" variant="ghost" aria-label="Delete post" onClick={() => confirm("Delete this post?") && del.mutate(post)}>
            <Trash2 />
          </Button>
        )}
      </header>

      {/* Small disclosure notification — always present, because disclosure is required. */}
      <button
        onClick={() => setWhy(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <BadgeInfo className="size-3.5" />
        {chips.length ? chips.join(" · ") : "No edits, filters or partnerships"}
      </button>

      {post.labels.length > 0 && !loud && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-care" />
          {post.labels.map(triggerLabel).join(" · ")}
        </p>
      )}

      <div className="relative mt-4">
        <div className={cn("space-y-4 transition", !revealed && "pointer-events-none select-none blur-xl")} aria-hidden={!revealed}>
          {post.mediaType === "text" ? (
            <p className="whitespace-pre-wrap rounded-2xl bg-lime-soft px-5 py-6 text-xl leading-relaxed">{post.body}</p>
          ) : (
            <>
              <PostMedia post={post} className="max-h-[36rem]" />
              {post.body && <p className="whitespace-pre-wrap text-base leading-relaxed">{post.body}</p>}
            </>
          )}
        </div>
        {!revealed && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-[1.5rem] border-2 border-care bg-card p-5 text-center shadow-float">
              <AlertTriangle className="mx-auto size-8 text-care" />
              <p className="heading-calm mt-2 text-2xl">Heads up</p>
              <p className="mt-1 text-base font-medium">{post.labels.map(triggerLabel).join(", ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">Labelled by the poster.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" variant="ink" onClick={() => setRevealed(true)}>
                  <Eye /> Show post
                </Button>
                <Button size="sm" variant="soft" onClick={() => setWhy(true)}>
                  See why
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-5 flex items-center border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">Likes and views stay hidden.</span>
        <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => setWhy(true)}>
          See why
        </Button>
      </footer>
      <SeeWhyDialog post={post} author={name} labelStyle={labelStyle} open={why} onOpenChange={setWhy} />
    </article>
  );
}
