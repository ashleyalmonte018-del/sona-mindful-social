import { createFileRoute } from "@tanstack/react-router";
import { Music2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { MoodDot, MoodPicker } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { CIRCLE } from "@/lib/sona/circle";
import { moodColor, moodLabel } from "@/lib/sona/types";

export const Route = createFileRoute("/_authenticated/circle")({
  head: () => ({
    meta: [
      { title: "Circle — Sona" },
      { name: "description", content: "Share just a song title and a mood dot with your circle." },
      { property: "og:title", content: "Circle — Sona" },
      { property: "og:description", content: "Share just enough: a song and a mood." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Circle />
    </AppShell>
  ),
});

function Circle() {
  const { profile, update } = useSona();
  const share = profile.settings.share;
  const [song, setSong] = useState(share.song);
  const [artist, setArtist] = useState(share.artist);
  const quiet = profile.settings.quietMode;

  return (
    <>
      <PageHeader eyebrow="Share just enough" title="Circle" sub="No posts, no stories, no seen-receipts. Just what's playing and a mood dot." />

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-4">
            <SonaFigure look={profile.look} doodle={profile.doodle} pose="sing" className="w-16" />
            <div>
              <p className="eyebrow text-muted-foreground">You're sharing</p>
              {quiet ? (
                <p className="subline">Nothing — quiet mode</p>
              ) : (
                <p className="flex items-center gap-2 text-sm">
                  <MoodDot color={moodColor(share.mood)} /> {share.song} — {share.artist}
                </p>
              )}
            </div>
          </div>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              update({ settings: { share: { ...share, song: song.trim().slice(0, 80), artist: artist.trim().slice(0, 80) } } }, { immediate: true });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="song">Song</Label>
              <Input id="song" value={song} onChange={(e) => setSong(e.target.value)} maxLength={80} className="rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="artist">Artist</Label>
              <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={80} className="rounded-full" />
            </div>
            <Button type="submit" variant="ink" className="w-full">
              Share song
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-sm">Mood dot</p>
            <div className="mt-2">
              <MoodPicker size="sm" value={share.mood} onPick={(m) => update({ settings: { share: { ...share, mood: m } } })} />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
            <div>
              <Label htmlFor="quiet">Quiet mode</Label>
              <p className="text-xs text-muted-foreground">Hide your share and mute your circle</p>
            </div>
            <Switch id="quiet" checked={quiet} onCheckedChange={(v) => update({ settings: { quietMode: v } })} />
          </div>
        </section>

        <section>
          {quiet ? (
            <div className="flex h-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-border p-10 text-center">
              <SonaFigure pose="rest" className="w-20" />
              <p className="heading-calm mt-4 text-3xl">Quiet mode</p>
              <p className="subline mt-1">Your circle is muted. They just see you as resting.</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {CIRCLE.map((f) => (
                <li key={f.id} className="flex items-center gap-4 rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
                  <SonaFigure look={f.look} pose={f.look.pose} className="w-16 shrink-0" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {f.name} <span className="text-xs font-normal text-muted-foreground">@{f.handle}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm">
                      <Music2 className="size-3.5 shrink-0 text-muted-foreground" /> {f.song}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{f.artist}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MoodDot color={moodColor(f.mood)} /> {moodLabel(f.mood)} · {f.sharedAgo} ago
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Your circle here is a sample group for now.</p>
        </section>
      </div>
    </>
  );
}
