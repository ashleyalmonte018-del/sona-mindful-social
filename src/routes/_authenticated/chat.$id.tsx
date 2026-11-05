import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CircleChat } from "@/components/social/CircleChat";
import { Button } from "@/components/ui/button";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { useCircleMembers } from "@/hooks/use-circle";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: () => <AppShell wide><ChatPage /></AppShell>,
});

function ChatPage() {
  const { profile } = useSona();
  const { id } = Route.useParams();
  const members = useCircleMembers();
  const member = members.data?.find((m) => m.id === id);
  return <>
    <PageHeader eyebrow="Your Circle" title={member ? `Chat with ${member.name}` : "Circle chat"} sub="A private conversation between mutual Circle members.">
      <Button asChild variant="soft"><Link to="/circle"><ArrowLeft /> Back to Circle</Link></Button>
    </PageHeader>
    {member ? <CircleChat members={[member]} myId={profile.id} /> : <p className="rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">That person is no longer in your Circle.</p>}
  </>;
}
