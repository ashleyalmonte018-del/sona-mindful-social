import { AlertTriangle, BadgeInfo, Play } from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UserPostCard } from "@/components/social/UserPostCard";
import { useSignedUrl, type PersonCard } from "@/hooks/use-social";
import { disclosureChips, type LabelStyle, type UserPost } from "@/lib/sona/social";
import { cn } from "@/lib/utils";

export function Gallery({
  posts,
  author,
  labelStyle,
  isMine,
}: {
  posts: UserPost[];
  author: PersonCard | undefined;
  labelStyle: LabelStyle;
  isMine?: boolean;
}) {
  const [open, setOpen] = useState<UserPost | null>(null);
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {posts.map((p) => (
          <li key={p.id}>
            <Tile post={p} loud={labelStyle === "loud"} onOpen={() => setOpen(p)} />
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Post</DialogTitle>
          {open && <UserPostCard post={open} author={author} labelStyle={labelStyle} isMine={isMine} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Tile({ post, loud, onOpen }: { post: UserPost; loud: boolean; onOpen: () => void }) {
  const url = useSignedUrl("post-media", post.mediaPath);
  const hide = loud && post.labels.length > 0;
  const chips = disclosureChips(post.disclosures);
  return (
    <button onClick={onOpen} className="group relative block aspect-square w-full overflow-hidden rounded-[1.25rem] border border-border bg-secondary text-left">
      <div className={cn("size-full", hide && "blur-lg")}>
        {post.mediaType === "text" ? (
          <p className="line-clamp-6 size-full bg-lime-soft p-4 text-sm leading-relaxed">{post.body}</p>
        ) : post.mediaType === "video" ? (
          url.data && <video src={url.data} preload="metadata" muted playsInline className="size-full object-cover" />
        ) : (
          url.data && <img src={url.data} alt={post.body.slice(0, 80) || "Photo post"} className="size-full object-cover transition group-hover:scale-[1.02]" />
        )}
      </div>
      {post.mediaType === "video" && (
        <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-ink text-ink-foreground">
          <Play className="ml-0.5 size-3.5" />
        </span>
      )}
      {hide && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-card/50 text-center text-xs font-medium">
          <AlertTriangle className="size-5 text-care" /> Heads up
        </span>
      )}
      {(chips.length > 0 || (post.labels.length > 0 && !hide)) && (
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[0.65rem] text-muted-foreground">
          {chips.length > 0 && <BadgeInfo className="size-3" />}
          {chips.length > 0 ? chips.join(" · ") : null}
          {post.labels.length > 0 && !hide && <span className="size-1.5 rounded-full bg-care" />}
        </span>
      )}
    </button>
  );
}
