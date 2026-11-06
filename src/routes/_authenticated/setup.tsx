import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { useSona } from '@/components/shell/SonaContext';
import { SonaFigure } from '@/components/sona/SonaFigure';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dial } from '@/components/vibe/Dial';
import { AGE_MODES, DIALS, FILTERS, GUARD_LEVELS, TOPICS, VIBE_PRESETS, type AgeMode } from '@/lib/sona/types';
import { validSetupAge } from '@/lib/sona/setup';

export const Route = createFileRoute('/_authenticated/setup')({
  head: () => ({ meta: [
    { title: 'Set Up your space — Sona' },
    { name: 'description', content: 'Choose your age group, content preferences and Sona companion.' },
    { property: 'og:title', content: 'Set Up your space — Sona' },
    { property: 'og:description', content: 'A personal start with your own preferences.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => <AppShell><Setup /></AppShell>,
});

function Setup() {
  const { profile, update } = useSona();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [age, setAge] = useState<AgeMode | null>(null);
  const [settings, setSettings] = useState(profile.settings);
  const [busy, setBusy] = useState(false);
  const titles = ['Your age group', 'Your vibe', 'What gets through', 'Your Sona'];
  async function finish(destination: '/feed' | '/studio' | '/profile') {
    if (!validSetupAge(age)) return;
    setBusy(true);
    try {
      await update({ ageMode: age, settings: { ...settings, setupCompleted: true } }, { immediate: true });
      await navigate({ to: destination });
    } catch {
      toast.error('Your setup could not be saved. Please try again.');
    } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-3xl">
    <div className="mb-6 flex items-center gap-3">
      <SonaFigure look={profile.look} pose="wave" className="w-16" />
      <p className="eyebrow text-muted-foreground">Set Up · {step + 1} of 4</p>
    </div>
    <PageHeader title={titles[step] ?? 'Set Up'} />
    {step === 0 && <div role="radiogroup" aria-label="Age group" className="grid gap-3 sm:grid-cols-3">
      {AGE_MODES.map((mode) => <Button key={mode.id} role="radio" aria-checked={age === mode.id} variant={age === mode.id ? 'ink' : 'outline'} className="h-auto min-h-36 flex-col whitespace-normal rounded-lg p-5" onClick={() => setAge(mode.id)}>
        <span className="heading-calm text-3xl">{mode.label}</span><span>{mode.who}</span>{age === mode.id && <Check />}
      </Button>)}
    </div>}
    {step === 1 && <>
      <div className="mb-8 flex flex-wrap gap-2">{VIBE_PRESETS.map((preset) => <Button key={preset.id} variant="outline" onClick={() => setSettings({ ...settings, vibe: { ...preset.dials } })}>{preset.label}</Button>)}</div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">{DIALS.map((dial) => <Dial key={dial.id} label={dial.label} color={dial.color} value={settings.vibe[dial.id]} onChange={(value) => setSettings({ ...settings, vibe: { ...settings.vibe, [dial.id]: value } })} />)}</div>
    </>}
    {step === 2 && <>
      <div className="mb-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Guard level">{GUARD_LEVELS.map((guard) => <Button key={guard.id} role="radio" aria-checked={settings.guard === guard.id} variant={settings.guard === guard.id ? 'ink' : 'outline'} onClick={() => setSettings({ ...settings, guard: guard.id })}>{guard.label}</Button>)}</div>
      <div className="divide-y divide-border">{TOPICS.map((topic) => <div key={topic.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><span className="font-medium">{topic.label}</span><div role="radiogroup" aria-label={topic.label} className="flex flex-wrap gap-1">{FILTERS.map((filter) => <Button key={filter.id} size="sm" role="radio" aria-checked={settings.curate[topic.id] === filter.id} variant={settings.curate[topic.id] === filter.id ? 'ink' : 'ghost'} onClick={() => setSettings({ ...settings, curate: { ...settings.curate, [topic.id]: filter.id } })}>{filter.label}</Button>)}</div></div>)}</div>
      <div className="mt-5 flex items-center justify-between"><Label htmlFor="setup-labels">Loud trigger labels</Label><Switch id="setup-labels" checked={settings.labelStyle === 'loud'} onCheckedChange={(on) => setSettings({ ...settings, labelStyle: on ? 'loud' : 'quiet' })} /></div>
    </>}
    {step === 3 && <div className="space-y-5">
      <SonaFigure look={profile.look} doodle={profile.doodle} pose="cheer" className="mx-auto w-36" />
      <div className="flex items-center justify-between border-b border-border py-4"><Label htmlFor="setup-helper">Sona helper</Label><Switch id="setup-helper" checked={settings.sonaEnabled} onCheckedChange={(on) => setSettings({ ...settings, sonaEnabled: on })} /></div>
      <div className="flex items-center justify-between border-b border-border py-4"><Label htmlFor="setup-checkins">15-minute check-ins</Label><Switch id="setup-checkins" checked={settings.checkIns} onCheckedChange={(on) => setSettings({ ...settings, checkIns: on })} /></div>
      <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={() => void finish('/studio')}>Personalize my Sona</Button><Button variant="outline" disabled={busy} onClick={() => void finish('/profile')}>Personalize my profile</Button></div>
    </div>}
    <div className="mt-10 flex items-center justify-between border-t border-border pt-5">
      <Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ArrowLeft /> Back</Button>
      {step < 3 ? <Button variant="ink" disabled={step === 0 && age === null} onClick={() => setStep(step + 1)}>Continue <ArrowRight /></Button> : <Button variant="ink" disabled={busy} onClick={() => void finish('/feed')}>{busy ? 'Saving…' : 'Skip personalization & finish'} <Check /></Button>}
    </div>
  </div>;
}