import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { UserPostCard } from "@/components/social/UserPostCard";
import { useCircleFeed, usePeopleCards, usePublicFeed } from "@/hooks/use-social";

/** Community (Public Feed) and Circle (friends-only) sections of the Feed. Both are finite. */
export function SocialFeed({ section }: { section: "community" | "circle" }) {
  const { profile } = useSona();
  const pub = usePublicFeed(15);
  const circle = useCircleFeed(profile.id, 15);
  const q = section === "community" ? pub : circle;
  const posts = q.data ?? [];
  const people = usePeopleCards(posts.map((p) => p.userId));

  return (
    <div className="mt-6 space-y-4">
      <p className="subline text-sm">
        {section === "community"
          ? "Recent posts shared to the Public Feed. Private accounts only show up here if you're an approved follower."
          : "Only friends' Circle posts — people you follow who follow you back."}
      </p>
      {q.isLoading ? (
        <div className="h-48 animate-pulse rounded-[1.75rem] bg-secondary" />
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-border p-10 text-center">
          <SonaFigure pose={section === "circle" ? "wave" : "read"} className="w-16" />
          <p className="mt-3 text-sm text-muted-foreground">
            {section === "circle" ? "No Circle posts yet. Follow friends and ask them to follow you back." : "Nothing in the Community feed yet — be the first."}
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild size="sm" variant="pill">
              <Link to="/people">Find people</Link>
            </Button>
            <Button asChild size="sm" variant="ink">
              <Link to="/makerspace">Make a post</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {posts.map((p) => (
            <UserPostCard key={p.id} post={p} author={people.data?.[p.userId]} labelStyle={profile.settings.labelStyle} isMine={p.userId === profile.id} />
          ))}
          <p className="subline pt-2 text-center">That's everyone for now. Close the app — it's a win.</p>
        </>
      )}
    </div>
  );
}
