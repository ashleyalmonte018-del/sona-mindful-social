import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSona } from "@/components/shell/SonaContext";
import { hashPasscode } from "@/hooks/use-sona-profile";

/** Asks for the parent passcode and calls onVerified when it matches. */
export function PasscodeDialog({
  open,
  onOpenChange,
  title = "Parent passcode",
  description = "A parent or guardian needs to enter the passcode.",
  onVerified,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  description?: string;
  onVerified: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="heading-calm text-3xl">{title}</DialogTitle>
          <DialogDescription className="subline">{description}</DialogDescription>
        </DialogHeader>
        {open && <PasscodeForm onVerified={onVerified} />}
      </DialogContent>
    </Dialog>
  );
}

export function PasscodeForm({ onVerified, cta = "Unlock" }: { onVerified: () => void; cta?: string }) {
  const { profile } = useSona();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const h = await hashPasscode(profile.id, code);
    setBusy(false);
    if (h === profile.passcodeHash) onVerified();
    else {
      setError("That passcode doesn't match.");
      setCode("");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        aria-label="Passcode"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
        placeholder="••••"
        className="rounded-full text-center text-2xl tracking-[0.5em]"
        autoFocus
      />
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="ink" className="w-full" disabled={busy || code.length < 4}>
        {cta}
      </Button>
    </form>
  );
}
