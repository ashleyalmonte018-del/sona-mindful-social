import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { Eraser, Redo2, Trash2, Undo2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/shell/AppShell";
import { useSona } from "@/components/shell/SonaContext";
import { DoodleCanvas } from "@/components/studio/DoodleCanvas";
import { POSE_OPTIONS, SonaFigure } from "@/components/sona/SonaFigure";
import type { Bottom, BodyType, ClothingStyle, DoodleStroke, Face, HairStyle, SonaLook } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Sona" },
      { name: "description", content: "Customize your Sona: body, skin tone, hair, clothes and your own scribbles." },
      { property: "og:title", content: "Studio — Sona" },
      { property: "og:description", content: "Build and doodle on your Sona helper." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell wide>
      <Studio />
    </AppShell>
  ),
});

const SKINS = ["#ffffff", "#fbe6d4", "#f1c9a5", "#e0ac7e", "#c68a5e", "#a86d45", "#8d5a3b", "#6b4129", "#4a2c1c", "#dfe9ff", "#e6f8c6", "#ffe1ec"];
const HAIR_COLORS = ["#1b1411", "#2b2220", "#6b3e1f", "#a0612e", "#c98a3c", "#e8c27a", "#b8b8b8", "#d6303a", "#f08a24", "#7b5cd6", "#4f7cf0", "#2dbf8a", "#f6b3c6"];
const CLOTH_COLORS = ["#d7f75b", "#ffffff", "#1f2430", "#9db7f5", "#4f7cf0", "#f08a24", "#d6303a", "#f6b3c6", "#c9a0dc", "#2dbf8a", "#e8c27a", "#b88a5a"];
const INKS = ["#1f2430", "#d6303a", "#f08a24", "#f2c230", "#2dbf8a", "#4f7cf0", "#7b5cd6", "#f6b3c6", "#ffffff"];

const BODIES: { id: BodyType; label: string }[] = [
  { id: "petite", label: "Petite" },
  { id: "classic", label: "Classic" },
  { id: "slim", label: "Slim" },
  { id: "round", label: "Round" },
  { id: "tall", label: "Tall" },
];
const HAIRS: { id: HairStyle; label: string }[] = [
  { id: "none", label: "None" },
  { id: "buzz", label: "Buzz" },
  { id: "crop", label: "Crop" },
  { id: "bob", label: "Bob" },
  { id: "long", label: "Long" },
  { id: "ponytail", label: "Ponytail" },
  { id: "buns", label: "Space buns" },
  { id: "braids", label: "Braids" },
  { id: "curls", label: "Curls" },
  { id: "afro", label: "Afro" },
  { id: "spiky", label: "Spiky" },
];
const CLOTHES: { id: ClothingStyle; label: string }[] = [
  { id: "none", label: "None" },
  { id: "tee", label: "Tee" },
  { id: "tank", label: "Tank" },
  { id: "longsleeve", label: "Long sleeve" },
  { id: "hoodie", label: "Hoodie" },
  { id: "sweater", label: "Sweater" },
  { id: "jacket", label: "Jacket" },
  { id: "jersey", label: "Jersey" },
  { id: "overalls", label: "Overalls" },
  { id: "dress", label: "Dress" },
];
const BOTTOMS: { id: Bottom; label: string }[] = [
  { id: "none", label: "None" },
  { id: "shorts", label: "Shorts" },
  { id: "pants", label: "Pants" },
  { id: "skirt", label: "Skirt" },
];
const ACCESSORIES: { id: SonaLook["accessory"]; label: string }[] = [
  { id: "none", label: "None" },
  { id: "scarf", label: "Scarf" },
  { id: "cap", label: "Cap" },
  { id: "headphones", label: "Headphones" },
  { id: "glasses", label: "Glasses" },
];
const FACES: { id: Face; label: string }[] = [
  { id: "none", label: "Classic (no face)" },
  { id: "dots", label: "Dot eyes" },
  { id: "smile", label: "Smile" },
];

function Studio() {
  const { profile, update } = useSona();
  const [look, setLook] = useState<SonaLook>(profile.look);
  const [strokes, setStrokes] = useState<DoodleStroke[]>(profile.doodle);
  const [redo, setRedo] = useState<DoodleStroke[]>([]);
  const [tab, setTab] = useState("body");
  const [ink, setInk] = useState(INKS[1]);
  const [brush, setBrush] = useState(3);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(look) !== JSON.stringify(profile.look) || JSON.stringify(strokes) !== JSON.stringify(profile.doodle);
  useBlocker({ shouldBlockFn: () => dirty && !window.confirm("Leave without saving your Sona?"), enableBeforeUnload: dirty });

  const set = <K extends keyof SonaLook>(k: K, v: SonaLook[K]) => setLook((l) => ({ ...l, [k]: v }));

  async function save() {
    setSaving(true);
    await update({ look, doodle: strokes }, { immediate: true });
    setSaving(false);
    toast.success(`${look.name || "Your Sona"} is saved`);
  }

  const doodling = tab === "doodle";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      {/* Stage */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow text-muted-foreground">The Studio</p>
        <h1 className="heading-calm mt-2 text-5xl md:text-6xl">Make your Sona</h1>
        <p className="subline mt-2">Every layer is built on the same frame, so it always fits.</p>

        <div className="relative mt-6 overflow-hidden rounded-[2.25rem] border border-border bg-card shadow-soft">
          <div className="absolute inset-0 bg-glow opacity-80" />
          <div className="relative mx-auto aspect-[120/178] w-full max-w-[18rem] py-2">
            <SonaFigure look={look} className="absolute inset-0 h-full w-full" />
            <DoodleCanvas
              strokes={strokes}
              color={ink}
              size={brush}
              active={doodling}
              onStroke={(s) => {
                setStrokes((x) => [...x, s]);
                setRedo([]);
              }}
            />
          </div>
          {doodling && <p className="relative pb-4 text-center text-xs text-muted-foreground">Draw anywhere on your Sona ✏️</p>}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Input value={look.name} onChange={(e) => set("name", e.target.value.slice(0, 24))} aria-label="Sona name" placeholder="Name your Sona" className="rounded-full" />
          <Button variant="ink" onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-full border border-border bg-card px-5 py-3">
          <div>
            <Label htmlFor="helper">Sona helper</Label>
            <p className="text-xs text-muted-foreground">Turn your companion on or off everywhere</p>
          </div>
          <Switch id="helper" checked={profile.settings.sonaEnabled} onCheckedChange={(v) => update({ settings: { sonaEnabled: v } })} />
        </div>
      </div>

      {/* Controls */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-full bg-secondary p-1">
          {["body", "hair", "clothes", "pose", "doodle"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full px-4 py-1.5 capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="body" className="mt-6 space-y-8">
          <Group title="Body type">
            <OptionGrid>
              {BODIES.map((b) => (
                <Option key={b.id} on={look.bodyType === b.id} label={b.label} onClick={() => set("bodyType", b.id)}>
                  <SonaFigure look={{ ...look, bodyType: b.id }} pose="stand" noShadow className="h-24" />
                </Option>
              ))}
            </OptionGrid>
          </Group>
          <Group title="Skin tone">
            <Swatches colors={SKINS} value={look.skin} onPick={(c) => set("skin", c)} />
          </Group>
          <Group title="Face">
            <div className="flex flex-wrap gap-2">
              {FACES.map((f) => (
                <Chip key={f.id} on={look.face === f.id} onClick={() => set("face", f.id)}>
                  {f.label}
                </Chip>
              ))}
            </div>
          </Group>
        </TabsContent>

        <TabsContent value="hair" className="mt-6 space-y-8">
          <Group title="Style">
            <OptionGrid>
              {HAIRS.map((h) => (
                <Option key={h.id} on={look.hairStyle === h.id} label={h.label} onClick={() => set("hairStyle", h.id)}>
                  <HeadCrop>
                    <SonaFigure look={{ ...look, hairStyle: h.id }} pose="stand" noShadow className="w-full" />
                  </HeadCrop>
                </Option>
              ))}
            </OptionGrid>
          </Group>
          <Group title="Color">
            <Swatches colors={HAIR_COLORS} value={look.hairColor} onPick={(c) => set("hairColor", c)} />
          </Group>
        </TabsContent>

        <TabsContent value="clothes" className="mt-6 space-y-8">
          <Group title="Top">
            <OptionGrid>
              {CLOTHES.map((c) => (
                <Option key={c.id} on={look.clothing === c.id} label={c.label} onClick={() => set("clothing", c.id)}>
                  <SonaFigure look={{ ...look, clothing: c.id }} pose="stand" noShadow className="h-24" />
                </Option>
              ))}
            </OptionGrid>
          </Group>
          <Group title={look.clothing === "dress" ? "Dress color" : "Top color"}>
            <Swatches colors={CLOTH_COLORS} value={look.topColor} onPick={(c) => set("topColor", c)} />
          </Group>
          {look.clothing !== "dress" && (
            <Group title={look.clothing === "overalls" ? "Overalls color" : "Bottoms"}>
              {look.clothing !== "overalls" && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {BOTTOMS.map((b) => (
                    <Chip key={b.id} on={look.bottom === b.id} onClick={() => set("bottom", b.id)}>
                      {b.label}
                    </Chip>
                  ))}
                </div>
              )}
              <Swatches colors={CLOTH_COLORS} value={look.bottomColor} onPick={(c) => set("bottomColor", c)} />
            </Group>
          )}
          <Group title="Accessory">
            <div className="mb-3 flex flex-wrap gap-2">
              {ACCESSORIES.map((a) => (
                <Chip key={a.id} on={look.accessory === a.id} onClick={() => set("accessory", a.id)}>
                  {a.label}
                </Chip>
              ))}
            </div>
            {look.accessory !== "none" && <Swatches colors={CLOTH_COLORS} value={look.accessoryColor} onPick={(c) => set("accessoryColor", c)} />}
          </Group>
        </TabsContent>

        <TabsContent value="pose" className="mt-6">
          <Group title="Favorite pose">
            <OptionGrid>
              {POSE_OPTIONS.map((p) => (
                <Option key={p} on={look.pose === p} label={p} onClick={() => set("pose", p)}>
                  <SonaFigure look={{ ...look, pose: p }} noShadow className="h-24" />
                </Option>
              ))}
            </OptionGrid>
          </Group>
        </TabsContent>

        <TabsContent value="doodle" className="mt-6 space-y-8">
          <p className="subline">Scribble right over your Sona — freckles, tattoos, patches, a tiny crown. It's yours.</p>
          <Group title="Ink">
            <div className="flex flex-wrap items-center gap-2">
              {INKS.map((c) => (
                <button
                  key={c}
                  onClick={() => setInk(c)}
                  aria-label={`Ink ${c}`}
                  aria-pressed={ink === c}
                  className={cn("size-9 rounded-full border-2 transition", ink === c ? "scale-110 border-foreground" : "border-border")}
                  style={{ background: c }}
                />
              ))}
              <label className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border text-xs text-muted-foreground" title="Custom color">
                +
                <input type="color" value={ink} onChange={(e) => setInk(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Custom ink color" />
              </label>
            </div>
          </Group>
          <Group title={`Brush size · ${brush}`}>
            <Slider value={[brush]} min={1} max={10} step={0.5} onValueChange={([v]) => setBrush(v)} className="max-w-sm" aria-label="Brush size" />
          </Group>
          <div className="flex flex-wrap gap-2">
            <Button variant="pill" size="sm" disabled={!strokes.length} onClick={() => { setRedo((r) => [strokes[strokes.length - 1], ...r]); setStrokes((s) => s.slice(0, -1)); }}>
              <Undo2 /> Undo
            </Button>
            <Button variant="pill" size="sm" disabled={!redo.length} onClick={() => { setStrokes((s) => [...s, redo[0]]); setRedo((r) => r.slice(1)); }}>
              <Redo2 /> Redo
            </Button>
            <Button variant="pill" size="sm" onClick={() => setInk(look.skin)}>
              <Eraser /> Skin-color eraser
            </Button>
            <Button variant="soft" size="sm" disabled={!strokes.length} onClick={() => { setRedo([]); setStrokes([]); }}>
              <Trash2 /> Clear
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{strokes.length} stroke{strokes.length === 1 ? "" : "s"} · saved with your Sona</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="eyebrow mb-3 text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function OptionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">{children}</div>;
}

function Option({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex flex-col items-center gap-1 rounded-[1.5rem] border bg-card p-3 transition hover:-translate-y-0.5",
        on ? "border-ink shadow-float ring-2 ring-lime" : "border-border",
      )}
    >
      {children}
      <span className="text-xs capitalize text-muted-foreground">{label}</span>
    </button>
  );
}

function HeadCrop({ children }: { children: ReactNode }) {
  return <div className="relative h-24 w-20 overflow-hidden [&>svg]:absolute [&>svg]:-top-1 [&>svg]:left-0 [&>svg]:w-[200%] [&>svg]:-translate-x-1/4">{children}</div>;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn("rounded-full border px-4 py-1.5 text-sm transition", on ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card hover:border-foreground/40")}
    >
      {children}
    </button>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          aria-label={`Color ${c}`}
          aria-pressed={value.toLowerCase() === c}
          className={cn("size-9 rounded-full border-2 transition", value.toLowerCase() === c ? "scale-110 border-foreground" : "border-border")}
          style={{ background: c }}
        />
      ))}
      <label className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border text-xs text-muted-foreground" title="Custom color">
        +
        <input type="color" value={value} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Custom color" />
      </label>
    </div>
  );
}
