import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeInfo, Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { UserPostCard } from "@/components/social/UserPostCard";
import { usePeopleCards } from "@/hooks/use-social";
import { supabase } from "@/integrations/supabase/client";
import { getSharedPost } from "@/lib/sona/shared-post.functions";
import { disclosureChips, parseDisclosures, toUserPost, triggerLabel } from "@/lib/sona/social";

export const Route = createFileRoute("/p/$postId")({
  loader: ({ params }) => getSharedPost({ data: { id: params.postId } }),
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.author.display_name} on Sona` : "A post on Sona";
    const desc = loaderData?.post.body ? loaderData.post.body.slice(0, 150) : "A post shared from Sona — the feed that filters before it reaches you.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: SharedPostPage,
});

function SharedPostPage() {
  const card = Route.useLoaderData();
  const { postId } = Route.useParams();
  const [myId, setMyId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  // Signed in: read through your own permissions (covers private and Circle posts shared in-app).
  const mine = useQuery({
    queryKey: ["post", postId, myId],
    enabled: Boolean(myId),
    queryFn: async () => {
      const { data } = await supabase.from("user_posts").select("*").eq("id", postId).maybeSingle();
      return data ? toUserPost(data) : null;
    },
  });
  const people = usePeopleCards(mine.data ? [mine.data.userId] : []);

  return (
    <main className="min-h-screen bg-background bg-glow-soft bg-grain px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="heading-calm text-2xl">Sona</Link>
        <div className="mt-6">
          {mine.data ? (
            <UserPostCard post={mine.data} author={people.data?.[mine.data.userId]} labelStyle="quiet" isMine={mine.data.userId === myId} myId={myId ?? undefined} />
          ) : card ? (
            <PublicCard card={card} />
          ) : myId === undefined || mine.isLoading ? (
            <div className="h-64 animate-pulse rounded-[1.75rem] bg-secondary" />
          ) : (
            <div className="rounded-[1.75rem] border border-border bg-card p-8 text-center shadow-soft">
              <Lock className="mx-auto size-8 text-muted-foreground" />
              <h1 className="heading-calm mt-3 text-3xl">This post is private</h1>
              <p className="subline mt-2">Only people the poster allows can see it.</p>
              {!myId && (
                <Button asChild variant="ink" className="mt-5">
                  <Link to="/auth">Sign in to Sona</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function PublicCard({ card }: { card: NonNullable<ReturnType<typeof Route.useLoaderData>> }) {
  const p = card.post;
  const chips = disclosureChips(parseDisclosures(p.disclosures));
  const labels = Array.isArray(p.labels) ? (p.labels as string[]) : [];
  const [revealed, setRevealed] = useState(labels.length === 0);
  return (
    <article className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft">
      <p className="text-sm font-medium">{card.author.display_name}{card.author.handle ? <span className="text-muted-foreground"> · @{card.author.handle}</span> : null}</p>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
        <BadgeInfo className="size-3.5" /> {chips.length ? chips.join(" · ") : "No edits, filters or partnerships"}
      </p>
      {labels.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Labelled: {labels.map(triggerLabel).join(" · ")}</p>}
      {revealed ? (
        <div className="mt-4 space-y-4">
          {card.mediaUrl && (p.media_type === "video" ? (
            <video src={card.mediaUrl} controls playsInline preload="metadata" className="w-full rounded-2xl bg-ink" />
          ) : (
            <img src={card.mediaUrl} alt="" className="w-full rounded-2xl" />
          ))}
          {p.body && <p className="whitespace-pre-wrap text-lg leading-relaxed">{p.body}</p>}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border-2 border-care p-6 text-center">
          <p className="heading-calm text-2xl">Heads up</p>
          <Button size="sm" variant="ink" className="mt-3" onClick={() => setRevealed(true)}>Show post</Button>
        </div>
      )}
      <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
        <SonaFigure pose="wave" className="w-10" />
        <p className="text-sm text-muted-foreground">Shared from Sona — a feed that filters before it reaches you.</p>
      </div>
    </article>
  );
}
