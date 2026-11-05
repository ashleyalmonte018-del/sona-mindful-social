import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, HeartHandshake, ImagePlus, Music2, Pencil, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/shell/AppShell";
import { MoodDot } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { PersonAvatar } from "@/components/social/Avatar";
import { Gallery } from "@/components/social/Gallery";
import { ProfileHeader } from "@/components/social/ProfileHeader";
import { useJournal, useMoods } from "@/hooks/use-sona-profile";
import { fileExt, useFollowActions, useFollowRequests, usePostsBy, useProfileCard, uploadMedia } from "@/hooks/use-social";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { careRule } from "@/lib/sona/care";
import { ACCENT_PRESETS, BIO_MAX, isHexColor, PRIVATE_HIDES, PROFILE_IMAGE_MAX_BYTES } from "@/lib/sona/social";
import { AGE_MODES, MOODS, moodColor, moodLabel } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Sona" },
      { name: "description", content: "Your Sona profile: gallery, bio, privacy, followers and mood trail." },
      { property: "og:title", content: "Profile — Sona" },
      { property: "og:description", content: "Your gallery, your privacy and your mood trail." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell wide>
      <Profile />
    </AppShell>
  ),
});

function Profile() {
  const { profile, update } = useSona();
  const qc = useQueryClient();
  const card = useProfileCard(profile.id);
  const posts = usePostsBy(profile.id);
  const requests = useFollowRequests(profile.id);
  const { approve, decline } = useFollowActions(profile.id);
  const { moods } = useMoods();
  const { entries } = useJournal();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile.bio);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);

  const age = AGE_MODES.find((a) => a.id === profile.ageMode)!;
  const recent = moods.slice(0, 21).reverse();
  const counts = MOODS.map((m) => ({ ...m, n: moods.filter((x) => x.mood === m.id).length })).filter((m) => m.n > 0);
  const activityDays = new Set(entries.map((e) => new Date(e.created_at).toDateString())).size;
  const list = posts.data ?? [];

  async function setImage(kind: "avatar" | "banner", file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Pick an image file"); return; }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) { toast.error("Profile images can be up to 5 MB"); return; }
    setUploading(kind);
    try {
      const path = await uploadMedia("profile-media", profile.id, file, fileExt(file, "jpg"));
      const old = kind === "avatar" ? profile.avatarPath : profile.bannerPath;
      await update(kind === "avatar" ? { avatarPath: path } : { bannerPath: path }, { immediate: true });
      if (old) await supabase.storage.from("profile-media").remove([old]);
      qc.invalidateQueries({ queryKey: ["profile-card"] });
      qc.invalidateQueries({ queryKey: ["people-cards"] });
    } catch (e) {
      toast.error("Upload didn't work", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading(null);
    }
  }

  async function clearImage(kind: "avatar" | "banner") {
    const old = kind === "avatar" ? profile.avatarPath : profile.bannerPath;
    await update(kind === "avatar" ? { avatarPath: null } : { bannerPath: null }, { immediate: true });
    if (old) await supabase.storage.from("profile-media").remove([old]);
  }

  const privacyChange = (p: Parameters<typeof update>[0]) =>
    update(p, { immediate: true }).then(() => qc.invalidateQueries({ queryKey: ["profile-card"] }));

  return (
    <div className="space-y-6">
      <ProfileHeader
        profileId={profile.id}
        name={profile.displayName}
        handle={profile.handle}
        bio={profile.bio || null}
        avatarPath={profile.avatarPath}
        bannerPath={profile.bannerPath}
        accent={profile.accentColor}
        sona={profile.look as unknown as Json}
        followers={card.data?.followers ?? 0}
        following={card.data?.following ?? 0}
        postCount={list.length}
        isPublic={profile.isPublic}
        hides={profile.privateHides}
      >
        <Button asChild variant="ink">
          <Link to="/makerspace">
            <Plus /> Post
          </Link>
        </Button>
        <Button variant="pill" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          <Pencil /> {editing ? "Done" : "Edit profile"}
        </Button>
        <Button asChild variant="soft" size="icon" aria-label="Find people">
          <Link to="/people">
            <Search />
          </Link>
        </Button>
      </ProfileHeader>

      {editing && (
        <section className="grid gap-6 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:grid-cols-2">
          <div>
            <Label htmlFor="bio">Description</Label>
            <Textarea id="bio" value={bio} maxLength={BIO_MAX} rows={4} onChange={(e) => setBio(e.target.value)} placeholder="A little about you…" className="mt-1.5 rounded-[1.25rem]" />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX}
              </span>
              <Button size="sm" variant="ink" disabled={bio === profile.bio} onClick={() => update({ bio: bio.trim() }, { immediate: true }).then(() => toast.success("Description saved"))}>
                Save description
              </Button>
            </div>
          </div>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <PersonAvatar path={profile.avatarPath} sona={profile.look as unknown as Json} name={profile.displayName} className="size-14" />
              <UploadButton label={uploading === "avatar" ? "Uploading…" : "Change picture"} onFile={(f) => setImage("avatar", f)} disabled={uploading !== null} />
              {profile.avatarPath && (
                <Button size="sm" variant="ghost" onClick={() => clearImage("avatar")}>
                  Use my Sona instead
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm">Banner</span>
              <UploadButton label={uploading === "banner" ? "Uploading…" : "Upload banner"} onFile={(f) => setImage("banner", f)} disabled={uploading !== null} />
              {profile.bannerPath && (
                <Button size="sm" variant="ghost" onClick={() => clearImage("banner")}>
                  Remove banner
                </Button>
              )}
            </div>
            <div>
              <p className="text-sm">Accent colour</p>
              <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Accent colour">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={profile.accentColor === c}
                    aria-label={c}
                    onClick={() => privacyChange({ accentColor: c })}
                    className={cn("flex size-8 items-center justify-center rounded-full border-2 transition", profile.accentColor === c ? "scale-110 border-ink" : "border-border")}
                    style={{ background: c }}
                  >
                    {profile.accentColor === c && <Check className="size-4 text-ink" />}
                  </button>
                ))}
                <label className="relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border" title="Custom colour">
                  <Plus className="size-4 text-muted-foreground" />
                  <input
                    type="color"
                    aria-label="Custom accent colour"
                    value={profile.accentColor}
                    onChange={(e) => isHexColor(e.target.value) && update({ accentColor: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {(requests.data?.length ?? 0) > 0 && (
            <section className="rounded-[2rem] border border-border bg-lime-soft p-6 shadow-soft">
              <h2 className="heading-calm text-3xl">Follow requests</h2>
              <ul className="mt-4 space-y-2">
                {requests.data!.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-[1.25rem] bg-card p-3">
                    <Link to="/people/$id" params={{ id: r.followerId }} className="flex min-w-0 flex-1 items-center gap-3">
                      <PersonAvatar path={r.person?.avatar_path} name={r.person?.display_name ?? "?"} className="size-10" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{r.person?.display_name ?? "Someone"}</span>
                        {r.person?.handle && <span className="block truncate text-xs text-muted-foreground">@{r.person.handle}</span>}
                      </span>
                    </Link>
                    <Button size="sm" variant="ink" disabled={approve.isPending} onClick={() => approve.mutate(r.id)}>
                      <Check /> Approve
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Decline" disabled={decline.isPending} onClick={() => decline.mutate(r.id)}>
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
            <div className="flex items-baseline justify-between">
              <h2 className="heading-calm text-3xl">Gallery</h2>
              <span className="text-xs text-muted-foreground">{list.length} posts</span>
            </div>
            {posts.isLoading ? (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-[1.25rem] bg-secondary" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-[1.5rem] border border-dashed border-border px-6 py-12 text-center">
                <SonaFigure look={profile.look} pose="box" className="w-16" />
                <p className="mt-3 text-sm text-muted-foreground">Nothing here yet. Make your first post in Maker Space.</p>
                <Button asChild variant="pill" size="sm" className="mt-4">
                  <Link to="/makerspace">Open Maker Space</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-4">
                <Gallery
                  posts={list}
                  isMine
                  labelStyle={profile.settings.labelStyle}
                  author={{ id: profile.id, display_name: profile.displayName, handle: profile.handle, avatar_path: profile.avatarPath }}
                />
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
            <div className="flex items-baseline justify-between">
              <h2 className="heading-calm text-3xl">Mood trail</h2>
              <span className="text-xs text-muted-foreground">{moods.length} check-ins · only you see this</span>
            </div>
            <p className="subline text-sm">Every dot is a moment you noticed how you felt.</p>
            {recent.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No check-ins yet — your Sona will ask soon.</p>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap gap-2">
                  {recent.map((m) => (
                    <span
                      key={m.id}
                      title={`${moodLabel(m.mood)} · ${new Date(m.created_at).toLocaleString()}`}
                      className="size-6 rounded-full border-2 border-card shadow-soft"
                      style={{ background: moodColor(m.mood) }}
                    />
                  ))}
                </div>
                <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {counts.map((c) => (
                    <li key={c.id} className="flex items-center gap-1.5">
                      <MoodDot color={c.color} /> {c.label} × {c.n}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard n={moods.length} label="check-ins" />
            <StatCard n={entries.length} label="care activities" />
            <StatCard n={activityDays} label="of 14 practice days" />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="private" className="heading-calm text-2xl">
                  Private account
                </Label>
                <p className="text-sm text-muted-foreground">{profile.isPublic ? "Anyone on Sona can follow you and see your posts." : "New followers need your approval."}</p>
              </div>
              <Switch id="private" checked={!profile.isPublic} onCheckedChange={(v) => privacyChange({ isPublic: !v })} />
            </div>
            {!profile.isPublic && (
              <div className="mt-4 space-y-2" role="radiogroup" aria-label="What to hide from people who don't follow you">
                <p className="eyebrow text-muted-foreground">Hide from non-followers</p>
                {PRIVATE_HIDES.map((h) => (
                  <button
                    key={h.id}
                    role="radio"
                    aria-checked={profile.privateHides === h.id}
                    onClick={() => privacyChange({ privateHides: h.id })}
                    className={cn(
                      "w-full rounded-[1.25rem] border p-3 text-left transition",
                      profile.privateHides === h.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-background hover:border-foreground/40",
                    )}
                  >
                    <p className="text-sm font-medium">{h.label}</p>
                    <p className={cn("text-xs", profile.privateHides === h.id ? "text-ink-foreground/70" : "text-muted-foreground")}>{h.blurb}</p>
                  </button>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">Either way, your Public Feed posts only reach approved followers while you're private.</p>
              </div>
            )}
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 text-center shadow-soft">
            <div className="absolute inset-0 bg-glow opacity-60" />
            <div className="relative">
              <SonaFigure look={profile.look} doodle={profile.doodle} className="mx-auto w-28" />
              <p className="heading-calm mt-2 text-2xl">{profile.look.name}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                <span className="rounded-full bg-ink px-3 py-1 text-ink-foreground">{age.label} mode</span>
                {profile.care.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full bg-care-soft px-3 py-1 text-care">
                    <HeartHandshake className="size-3" /> {careRule(c).label}
                  </span>
                ))}
              </div>
              {!profile.settings.quietMode && (
                <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Music2 className="size-3.5" /> {profile.settings.share.song} — {profile.settings.share.artist}
                  <MoodDot color={moodColor(profile.settings.share.mood)} />
                </p>
              )}
              <div className="mt-5 flex justify-center gap-2">
                <Button asChild variant="ink" size="sm">
                  <Link to="/studio">Edit my Sona</Link>
                </Button>
                <Button asChild variant="pill" size="sm">
                  <Link to="/settings">Settings</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
            <h2 className="heading-calm text-2xl">14-day practice</h2>
            <p className="subline text-sm">Reframing, mindfulness and journaling live in Care.</p>
            <Button asChild variant="pill" size="sm" className="mt-3">
              <Link to="/care">Open Care</Link>
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function UploadButton({ label, onFile, disabled }: { label: string; onFile: (f: File | undefined) => void; disabled?: boolean }) {
  return (
    <label className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 text-xs text-muted-foreground transition hover:text-foreground", disabled && "pointer-events-none opacity-50")}>
      <ImagePlus className="size-3.5" /> {label}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function StatCard({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-card p-5 text-center shadow-soft">
      <p className="heading-calm text-5xl">{n}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
