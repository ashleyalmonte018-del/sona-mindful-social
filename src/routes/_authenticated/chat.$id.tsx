import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CircleChat } from "@/components/social/CircleChat";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { useCircleMembers } from "@/hooks/use-circle";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({
    meta: [
      { title: "Circle chat — Sona" },
      { name: "description", content: "Private conversations with your mutual Circle members." },
      { property: "og:title", content: "Circle chat — Sona" },
      { property: "og:description", content: "A private conversation in your Circle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell wide>
      <ChatPage />
    </AppShell>
  ),
});

function ChatPage() {
  const { profile } = useSona();
  const { id } = Route.useParams();
  const members = useCircleMembers();
  const member = members.data?.find((m) => m.id === id);
  if (member) return <CircleChat members={[member]} myId={profile.id} />;
  if (members.isLoading)
    return (
      <div className="h-[min(72dvh,52rem)] min-h-[28rem] animate-pulse rounded-[2rem] bg-card" />
    );
  return (
    <section className="rounded-[2rem] border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">That person is no longer in your Circle.</p>
      <Button asChild variant="soft" className="mt-4">
        <Link to="/circle">
          <ArrowLeft /> Back to Circle
        </Link>
      </Button>
    </section>
  );
}
