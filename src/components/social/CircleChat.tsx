import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { CircleMember } from "@/hooks/use-circle";

type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

export function CircleChat({ members, myId }: { members: CircleMember[]; myId: string }) {
  const [person, setPerson] = useState(members[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!members.some((m) => m.id === person)) setPerson(members[0]?.id ?? ""); }, [members, person]);
  useEffect(() => {
    if (!person) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from("circle_messages").select("*").or(`and(sender_id.eq.${myId},recipient_id.eq.${person}),and(sender_id.eq.${person},recipient_id.eq.${myId})`).order("created_at", { ascending: true }).limit(100);
      if (error) toast.error("Couldn't load chat");
      else if (active) setMessages((data ?? []) as Message[]);
    };
    void load();
    const channel = supabase.channel(`circle-chat:${myId}:${person}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "circle_messages" }, (payload) => {
      const m = payload.new as Message;
      if ((m.sender_id === myId && m.recipient_id === person) || (m.sender_id === person && m.recipient_id === myId)) setMessages((old) => old.some((x) => x.id === m.id) ? old : [...old, m]);
    }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [myId, person]);

  async function send() {
    const text = body.trim();
    if (!text || !person) return;
    setBusy(true);
    const { error } = await supabase.from("circle_messages").insert({ sender_id: myId, recipient_id: person, body: text });
    setBusy(false);
    if (error) toast.error("Couldn't send that", { description: error.message }); else setBody("");
  }

  return <section className="rounded-[2rem] border border-border bg-card p-5 shadow-soft">
    <h2 className="heading-calm text-2xl">Circle chat</h2>
    {members.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Become mutual friends to start a chat.</p> : <>
      <select value={person} onChange={(e) => setPerson(e.target.value)} className="mt-3 w-full rounded-full border border-border bg-background px-3 py-2 text-sm">
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-2xl bg-secondary/60 p-3" aria-live="polite">
        {messages.length === 0 ? <p className="text-xs text-muted-foreground">Say hi — messages update live on both devices.</p> : messages.map((m) => <p key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.sender_id === myId ? "ml-6 bg-ink text-ink-foreground" : "mr-6 bg-card"}`}>{m.body}</p>)}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <Input value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Write a message…" className="rounded-full" />
        <Button type="submit" size="icon" variant="ink" disabled={busy || !body.trim()} aria-label="Send message"><Send /></Button>
      </form>
    </>}
  </section>;
}
