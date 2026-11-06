import { ArrowLeft, ImagePlus, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSona } from "@/components/shell/SonaContext";
import { fileExt, uploadMedia, useSignedUrl } from "@/hooks/use-social";
import type { CircleMember } from "@/hooks/use-circle";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};
const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024;
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function ChatAvatar({
  path,
  name,
  className,
}: {
  path?: string | null;
  name: string;
  className: string;
}) {
  const avatar = useSignedUrl("profile-media", path);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary ${className}`}
    >
      {avatar.data ? (
        <img src={avatar.data} alt="" className="size-full object-cover" />
      ) : (
        <span className="font-medium text-secondary-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function dayKey(date: string) {
  const parsed = new Date(date);
  return `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`;
}

export function CircleChat({ members, myId }: { members: CircleMember[]; myId: string }) {
  const { profile, update } = useSona();
  const [person, setPerson] = useState(members[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [wallpaperBusy, setWallpaperBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const member = members.find((entry) => entry.id === person);
  const backgroundPath = profile.settings.chatBackgroundPath;
  const background = useSignedUrl("chat-backgrounds", backgroundPath);

  useEffect(() => {
    if (!members.some((entry) => entry.id === person)) setPerson(members[0]?.id ?? "");
  }, [members, person]);

  useEffect(() => {
    if (!person) {
      setMessages([]);
      return;
    }

    let active = true;
    setMessages([]);
    setLoadError(null);
    const channel = supabase
      .channel(`circle-chat:${myId}:${person}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "circle_messages" },
        (payload) => {
          const message = payload.new as Message;
          if (
            (message.sender_id === myId && message.recipient_id === person) ||
            (message.sender_id === person && message.recipient_id === myId)
          ) {
            setMessages((old) =>
              old.some((existing) => existing.id === message.id) ? old : [...old, message],
            );
          }
        },
      )
      .subscribe();

    async function loadMessages() {
      const { data, error } = await supabase
        .from("circle_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${myId},recipient_id.eq.${person}),and(sender_id.eq.${person},recipient_id.eq.${myId})`,
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active) return;
      if (error) {
        setLoadError(
          /circle_messages|schema cache|relation .* does not exist/i.test(error.message)
            ? "Chat needs a database update. Apply the latest Supabase migration, then reload."
            : error.message,
        );
        return;
      }
      setLoadError(null);
      setMessages((current) => {
        const byId = new Map((data ?? []).map((message) => [message.id, message as Message]));
        for (const message of current) byId.set(message.id, message);
        return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    }

    void loadMessages();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [myId, person]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !person || busy) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("circle_messages")
      .insert({ sender_id: myId, recipient_id: person, body: text })
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      const missing = /circle_messages|schema cache|relation .* does not exist/i.test(
        error.message,
      );
      toast.error(missing ? "Chat needs a database update" : "Couldn't send that", {
        description: missing ? "Apply the latest Supabase migration, then reload." : error.message,
      });
      return;
    }
    setBody("");
    setMessages((old) =>
      old.some((message) => message.id === data.id) ? old : [...old, data as Message],
    );
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function setWallpaper(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, WebP, or GIF image for your chat background.");
      return;
    }
    if (file.size > MAX_BACKGROUND_SIZE) {
      toast.error("That image is too large", {
        description: "Choose an image smaller than 10 MB.",
      });
      return;
    }

    setWallpaperBusy(true);
    let uploadedPath: string | null = null;
    try {
      uploadedPath = await uploadMedia("chat-backgrounds", myId, file, fileExt(file, "jpg"));
      await update({ settings: { chatBackgroundPath: uploadedPath } }, { immediate: true });
      if (backgroundPath) {
        const { error } = await supabase.storage.from("chat-backgrounds").remove([backgroundPath]);
        if (error)
          toast.error("Background saved, but the old photo couldn't be removed", {
            description: error.message,
          });
      }
      toast.success("Chat background updated.");
    } catch (error) {
      if (uploadedPath) {
        const { error: removeError } = await supabase.storage
          .from("chat-backgrounds")
          .remove([uploadedPath]);
        if (removeError)
          toast.error("Couldn't clean up the unused background image", {
            description: removeError.message,
          });
      }
      toast.error("Couldn't update the chat background", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWallpaperBusy(false);
    }
  }

  async function clearWallpaper() {
    if (!backgroundPath || wallpaperBusy) return;
    setWallpaperBusy(true);
    try {
      await update({ settings: { chatBackgroundPath: null } }, { immediate: true });
      const { error } = await supabase.storage.from("chat-backgrounds").remove([backgroundPath]);
      if (error) throw error;
      toast.success("Chat background removed.");
    } catch (error) {
      toast.error("Couldn't remove the chat background", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWallpaperBusy(false);
    }
  }

  return (
    <section className="flex h-[min(72dvh,52rem)] min-h-[28rem] flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:px-6">
        <Button asChild size="icon" variant="ghost" aria-label="Back to Circle">
          <Link to="/circle">
            <ArrowLeft />
          </Link>
        </Button>
        {member && <ChatAvatar path={member.avatarPath} name={member.name} className="size-11" />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-medium">{member?.name ?? "Circle chat"}</h1>
          <p className="text-xs text-muted-foreground">
            {member ? "Private conversation" : "Your Circle"}
          </p>
        </div>
        {member && (
          <>
            <Button
              type="button"
              size="icon"
              variant="soft"
              onClick={() => fileRef.current?.click()}
              disabled={wallpaperBusy}
              aria-label="Upload a personal chat background"
              title="Change your chat background"
            >
              <ImagePlus />
            </Button>
            {backgroundPath && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => void clearWallpaper()}
                disabled={wallpaperBusy}
                aria-label="Remove chat background"
                title="Remove chat background"
              >
                <Trash2 />
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void setWallpaper(file);
              }}
            />
          </>
        )}
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
        {background.data && (
          <>
            <img
              src={background.data}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-background/80" aria-hidden="true" />
          </>
        )}
        {members.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Become mutual friends to start a chat.
          </p>
        ) : loadError ? (
          <p className="relative m-4 rounded-2xl bg-care-soft p-4 text-sm text-care" role="alert">
            {loadError}
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="relative h-full overflow-y-auto px-4 py-5 md:px-8"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ChatAvatar
                  path={member?.avatarPath}
                  name={member?.name ?? "Friend"}
                  className="size-16"
                />
                <p className="mt-3 font-medium">This is the beginning of your conversation</p>
                <p className="mt-1 text-sm text-muted-foreground">Send a message to say hello.</p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-1">
                {messages.map((message, index) => {
                  const mine = message.sender_id === myId;
                  const previous = messages[index - 1];
                  const next = messages[index + 1];
                  const newDay =
                    !previous || dayKey(previous.created_at) !== dayKey(message.created_at);
                  const beginsGroup =
                    !previous || previous.sender_id !== message.sender_id || newDay;
                  const endsGroup =
                    !next ||
                    next.sender_id !== message.sender_id ||
                    dayKey(next.created_at) !== dayKey(message.created_at);
                  return (
                    <div key={message.id}>
                      {newDay && (
                        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="h-px flex-1 bg-border" />
                          <time dateTime={message.created_at}>
                            {dayFormat.format(new Date(message.created_at))}
                          </time>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div
                        className={`flex ${mine ? "justify-end" : "justify-start"} ${beginsGroup && !newDay ? "mt-3" : ""}`}
                      >
                        <div
                          className={`max-w-[85%] px-4 py-2.5 text-sm shadow-sm md:max-w-[72%] ${
                            mine
                              ? `bg-ink text-ink-foreground ${beginsGroup ? "rounded-2xl rounded-tr-md" : "rounded-2xl"} ${endsGroup ? "rounded-br-md" : ""}`
                              : `border border-border/70 bg-card/95 text-card-foreground backdrop-blur ${beginsGroup ? "rounded-2xl rounded-tl-md" : "rounded-2xl"} ${endsGroup ? "rounded-bl-md" : ""}`
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          {endsGroup && (
                            <time
                              className={`mt-1 block text-right text-[0.65rem] ${mine ? "text-ink-foreground/65" : "text-muted-foreground"}`}
                              dateTime={message.created_at}
                            >
                              {timeFormat.format(new Date(message.created_at))}
                            </time>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {member && (
        <form
          onSubmit={(event) => void send(event)}
          className="flex shrink-0 items-end gap-2 border-t border-border bg-card/95 p-3 backdrop-blur md:gap-3 md:p-4"
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={onComposerKeyDown}
            maxLength={2000}
            rows={1}
            placeholder="Write a message…"
            aria-label="Write a message"
            className="max-h-32 min-h-11 resize-y rounded-2xl bg-background px-4 py-3"
          />
          <Button
            type="submit"
            size="icon"
            variant="ink"
            className="size-11 shrink-0 rounded-full"
            disabled={busy || !body.trim()}
            aria-label="Send message"
          >
            <Send />
          </Button>
        </form>
      )}
    </section>
  );
}
