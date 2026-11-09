import { useQuery } from "@tanstack/react-query";
import { Check, Link2, Lock, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PersonAvatar } from "@/components/social/Avatar";
import { useSearchPeople } from "@/hooks/use-social";
import { supabase } from "@/integrations/supabase/client";
import type { UserPost } from "@/lib/sona/social";

/** Copy link (public posts only) and in-app sending. The database decides who may receive it. */
export function ShareDialog({ post, open, onOpenChange }: { post: UserPost; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["me-id"],
    enabled: open,
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const linkable = useQuery({
    queryKey: ["post-link", post.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.rpc("public_post_link", { _post: post.id });
      return Boolean(data);
    },
  });
  const followers = useQuery({
    queryKey: ["followers-list", me.data],
    enabled: open && Boolean(me.data),
    queryFn: async () => {
      const { data } = await supabase.rpc("followers_list", { _owner: me.data! });
      return data ?? [];
    },
  });
  const search = useSearchPeople(q);
  const people = (q.trim() ? (search.data ?? []) : (followers.data ?? [])).filter((p) => p.id !== me.data);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`);
    toast.success("Link copied");
  }
  async function sendTo(id: string) {
    setBusy(id);
    const { error } = await supabase.rpc("share_post_to", { _post: post.id, _recipient: id });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent((s) => [...s, id]);
    toast.success("Sent");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-calm text-3xl">Share</DialogTitle>
          <DialogDescription>The poster's privacy always wins — some people may not be able to receive it.</DialogDescription>
        </DialogHeader>

        {linkable.data ? (
          <Button variant="pill" onClick={copy}><Link2 /> Copy link</Button>
        ) : (
          <p className="flex items-start gap-2 rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            Links are only for public accounts' Public Feed posts. This one can be shared in-app, to people who are allowed to see it.
          </p>
        )}

        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="rounded-full" aria-label="Search people to send to" />
        <p className="text-xs text-muted-foreground">{q.trim() ? "Results" : "Your followers"}</p>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {people.length === 0 && <li className="p-2 text-sm text-muted-foreground">Nobody here yet.</li>}
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl p-2">
              <PersonAvatar path={p.avatar_path} name={p.display_name} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.display_name}</p>
                {p.handle && <p className="truncate text-xs text-muted-foreground">@{p.handle}</p>}
              </div>
              <Button size="sm" variant={sent.includes(p.id) ? "soft" : "ink"} disabled={sent.includes(p.id) || busy === p.id} onClick={() => sendTo(p.id)}>
                {sent.includes(p.id) ? <><Check /> Sent</> : <><Send /> Send</>}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
