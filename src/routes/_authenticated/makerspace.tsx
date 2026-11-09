import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ImagePlus, Lock, Video } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhotoEditor } from "@/components/makerspace/PhotoEditor";
import { exportPhoto, loadSource } from "@/components/makerspace/render";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { fileExt, uploadMedia } from "@/hooks/use-social";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_EDIT, detectEdits, type EditState } from "@/lib/sona/image-edit";
import {
  AUDIENCES,
  BODY_MAX,
  DISCLOSURES,
  MEDIA_TYPES,
  NOTE_MAX,
  PHOTO_MAX_BYTES,
  TRIGGER_LABELS,
  validateDraft,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_SECONDS,
  type Audience,
  type DraftDisclosures,
  type MediaType,
} from "@/lib/sona/social";
import { cn } from "@/lib/utils";
import { CIRCLE_TIERS, type TierId } from "@/lib/sona/tiers";

export const Route = createFileRoute("/_authenticated/makerspace")({
  head: () => ({
    meta: [
      { title: "Maker Space — Sona" },
      { name: "description", content: "Make a photo, text or video post with honest disclosures and trigger labels." },
      { property: "og:title", content: "Maker Space — Sona" },
      { property: "og:description", content: "Edit, disclose and share to your gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell wide>
      <MakerSpace />
    </AppShell>
  ),
});

function MakerSpace() {
  const { profile } = useSona();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [type, setType] = useState<MediaType>("photo");
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [photoBytes, setPhotoBytes] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditState>(DEFAULT_EDIT);
  const [video, setVideo] = useState<{ file: File; url: string; seconds: number } | null>(null);
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("public");
  const [disc, setDisc] = useState<DraftDisclosures>({ edited: null, filter: null, paid: null });
  const [note, setNote] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [shareable, setShareable] = useState(true);
  const [postTiers, setPostTiers] = useState<TierId[]>([]);


  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video.url);
  }, [video]);

  const detected = type === "photo" && source ? detectEdits(edit) : { edited: false, filter: false };
  const disclosures: DraftDisclosures = {
    edited: detected.edited ? true : disc.edited,
    filter: detected.filter ? true : disc.filter,
    paid: disc.paid,
  };
  const errors = validateDraft({
    mediaType: type,
    body,
    hasMedia: type === "photo" ? !!source : type === "video" ? !!video : false,
    videoSeconds: video?.seconds ?? null,
    mediaBytes: type === "video" ? (video?.file.size ?? null) : type === "photo" ? photoBytes : null,
    disclosures,
    note,
    labels,
  });

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Pick an image file"); return; }
    if (file.size > PHOTO_MAX_BYTES) { toast.error("Photos can be up to 15 MB"); return; }
    try {
      setSource(await loadSource(file));
      setPhotoBytes(file.size);
      setEdit(DEFAULT_EDIT);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That image couldn't be opened");
    }
  }

  function pickVideo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Pick a video file"); return; }
    if (file.size > VIDEO_MAX_BYTES) { toast.error("Videos can be up to 50 MB"); return; }
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const seconds = Math.round(probe.duration * 10) / 10;
      if (seconds > VIDEO_MAX_SECONDS) {
        URL.revokeObjectURL(url);
        toast.error(`Videos can be up to ${VIDEO_MAX_SECONDS} seconds — this one is ${Math.round(seconds)}s`);
        return;
      }
      setVideo({ file, url, seconds });
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("That video couldn't be opened");
    };
    probe.src = url;
  }

  async function publish() {
    setTried(true);
    if (errors.length) return;
    setBusy(true);
    let path: string | null = null;
    try {
      if (type === "photo" && source) path = await uploadMedia("post-media", profile.id, await exportPhoto(source, edit), "jpg");
      if (type === "video" && video) path = await uploadMedia("post-media", profile.id, video.file, fileExt(video.file, "mp4"));
      const postId = crypto.randomUUID();
      const aud = postTiers.length ? "circle" : audience;
      if (postTiers.length) {
        const t = await supabase.from("post_tiers").insert(postTiers.map((tier) => ({ post_id: postId, owner_id: profile.id, tier })));
        if (t.error) throw t.error;
      }
      const { error } = await supabase.from("user_posts").insert({
        id: postId,
        user_id: profile.id,
        body: body.trim(),
        media_type: type,
        image_path: path,
        audience: aud,
        category: aud === "circle" ? "friends" : "inspiration",
        disclosures: { edited: !!disclosures.edited, filter: !!disclosures.filter, paid: !!disclosures.paid },
        disclosure_note: note.trim() || null,
        labels,
        is_shareable: shareable,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["posts-by"] });
      qc.invalidateQueries({ queryKey: ["feed-public"] });
      qc.invalidateQueries({ queryKey: ["profile-card"] });
      toast.success("Shared to your gallery");
      navigate({ to: "/profile" });
    } catch (e) {
      if (path) await supabase.storage.from("post-media").remove([path]);
      toast.error("Couldn't share that", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Make something" title="Maker Space" sub="Edit it, say honestly what you changed, and choose who it reaches.">
        <SonaFigure look={profile.look} doodle={profile.doodle} pose="box" className="hidden w-20 md:block" />
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-5">
          <div role="tablist" aria-label="Post type" className="grid grid-cols-3 gap-2">
            {MEDIA_TYPES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={type === m.id}
                onClick={() => setType(m.id)}
                className={cn(
                  "rounded-[1.25rem] border p-3 text-left transition",
                  type === m.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card hover:border-foreground/40",
                )}
              >
                <p className="heading-calm text-xl">{m.label}</p>
                <p className={cn("text-xs", type === m.id ? "text-ink-foreground/70" : "text-muted-foreground")}>{m.blurb}</p>
              </button>
            ))}
          </div>

          {type === "photo" &&
            (source ? (
              <>
                <PhotoEditor source={source} state={edit} onChange={setEdit} />
                <Button variant="soft" size="sm" onClick={() => (setSource(null), setEdit(DEFAULT_EDIT))}>
                  Choose a different photo
                </Button>
              </>
            ) : (
              <DropZone icon={<ImagePlus className="size-8" />} label="Add a photo" hint="JPG, PNG or WebP, up to 15 MB" accept="image/*" onFile={pickPhoto} />
            ))}

          {type === "video" &&
            (video ? (
              <div className="space-y-3">
                <video src={video.url} controls playsInline preload="metadata" className="max-h-[60vh] w-full rounded-[1.5rem] bg-ink" />
                <p className="text-xs text-muted-foreground">
                  {video.seconds}s · {(video.file.size / 1024 / 1024).toFixed(1)} MB — viewers tap to play; nothing autoplays.
                </p>
                <Button variant="soft" size="sm" onClick={() => setVideo(null)}>
                  Choose a different video
                </Button>
              </div>
            ) : (
              <DropZone icon={<Video className="size-8" />} label="Add a video" hint={`Up to ${VIDEO_MAX_SECONDS} seconds and 50 MB`} accept="video/mp4,video/webm,video/quicktime" onFile={pickVideo} />
            ))}

          <div>
            <label htmlFor="body" className="eyebrow text-muted-foreground">
              {type === "text" ? "Your post" : "Caption (optional)"}
            </label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={BODY_MAX}
              rows={type === "text" ? 8 : 3}
              placeholder={type === "text" ? "What's on your mind?" : "Say something about it…"}
              className={cn("mt-2 rounded-[1.25rem]", type === "text" && "bg-lime-soft text-lg")}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {body.length}/{BODY_MAX}
            </p>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
            <h2 className="heading-calm text-2xl">Who sees it</h2>
            <div className="mt-3 space-y-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAudience(a.id)}
                  aria-pressed={audience === a.id}
                  className={cn(
                    "w-full rounded-[1.25rem] border p-3 text-left transition",
                    audience === a.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-background hover:border-foreground/40",
                  )}
                >
                  <p className="font-medium">{a.label}</p>
                  <p className={cn("text-xs", audience === a.id ? "text-ink-foreground/70" : "text-muted-foreground")}>{a.blurb}</p>
                </button>
              ))}
            </div>
            {!profile.isPublic && audience === "public" && (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" /> Your account is private, so this only reaches your approved followers.
              </p>
            )}
                        <label className="mt-3 flex items-start gap-3 rounded-2xl border border-border p-3">
              <input
                type="checkbox"
                checked={shareable}
                onChange={(e) => setShareable(e.target.checked)}
                className="mt-0.5 size-4"
              />
              <span className="text-sm">
                Let others share this post
                <span className="block text-xs text-muted-foreground">
                  People who can see it can send it in-app. Public posts from public accounts also get a copy link.
                </span>
              </span>
            </label>
            <div className="mt-4">
              <p className="text-sm">Only these circle tiers <span className="text-muted-foreground">(optional)</span></p>
              <p className="text-xs text-muted-foreground">Pick tiers and only circle members you've put in them will see it.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CIRCLE_TIERS.map((t) => {
                  const on = postTiers.includes(t.id);
                  return (
                    <button key={t.id} type="button" aria-pressed={on} onClick={() => setPostTiers((xs) => (on ? xs.filter((x) => x !== t.id) : [...xs, t.id]))} className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-ink bg-ink text-ink-foreground" : "border-border bg-background")}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
            <h2 className="heading-calm text-2xl">Disclose</h2>
            <p className="subline text-sm">Required. It shows as a small note on your post.</p>
            <ul className="mt-3 space-y-3">
              {DISCLOSURES.map((d) => {
                const auto = (d.id === "edited" && detected.edited) || (d.id === "filter" && detected.filter);
                const v = disclosures[d.id];
                return (
                  <li key={d.id} className={cn("rounded-2xl border p-3", tried && v === null ? "border-destructive" : "border-border")}>
                    <p className="text-sm">{d.question}</p>
                    <div className="mt-2 flex gap-2" role="radiogroup" aria-label={d.label}>
                      {[true, false].map((ans) => (
                        <button
                          key={String(ans)}
                          role="radio"
                          aria-checked={v === ans}
                          disabled={auto && !ans}
                          onClick={() => setDisc((s) => ({ ...s, [d.id]: ans }))}
                          className={cn(
                            "inline-flex flex-1 items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-40",
                            v === ans ? "border-ink bg-ink text-ink-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {v === ans && <Check className="size-3.5" />} {ans ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                    {auto && <p className="mt-1.5 text-xs text-muted-foreground">Set to yes — you {d.id === "filter" ? "used a filter" : "edited this"} in Maker Space.</p>}
                  </li>
                );
              })}
            </ul>
            <label htmlFor="note" className="mt-4 block text-sm">
              Describe your edits <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={NOTE_MAX}
              rows={2}
              placeholder="e.g. brightened the sky, removed a sign in the background"
              className="mt-1.5 rounded-[1rem]"
            />
          </section>

          <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
            <h2 className="heading-calm text-2xl">Trigger labels</h2>
            <p className="subline text-sm">Pick anything that might be hard for someone to see. Viewers choose whether labels are Loud or Quiet.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TRIGGER_LABELS.map((t) => {
                const on = labels.includes(t.id);
                return (
                  <button
                    key={t.id}
                    aria-pressed={on}
                    onClick={() => setLabels((l) => (on ? l.filter((x) => x !== t.id) : [...l, t.id]))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      on ? "border-care bg-care text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>

          {tried && errors.length > 0 && (
            <ul className="space-y-1 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <Button variant="ink" size="lg" className="w-full" disabled={busy} onClick={publish}>
            {busy ? "Sharing…" : "Share to my gallery"}
          </Button>
        </aside>
      </div>
    </>
  );
}

function DropZone({ icon, label, hint, accept, onFile }: { icon: ReactNode; label: string; hint: string; accept: string; onFile: (f: File | undefined) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.75rem] border-2 border-dashed border-border bg-card/60 px-6 py-16 text-center transition hover:border-foreground/40">
      <span className="text-muted-foreground">{icon}</span>
      <span className="heading-calm text-2xl">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}
