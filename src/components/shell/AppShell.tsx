import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { CheckInOverlay } from "@/components/shell/CheckInOverlay";
import { SonaHelper } from "@/components/shell/SonaHelper";
import { SonaProvider } from "@/components/shell/SonaContext";
import { useSonaProfile } from "@/hooks/use-sona-profile";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTime } from "@/lib/sona/usage";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/feed", label: "Feed" },
  { to: "/zone", label: "Zone" },
  { to: "/studio", label: "Studio" },
  { to: "/curate", label: "Curate" },
  { to: "/vibe", label: "Vibe" },
  { to: "/circle", label: "Circle" },
  { to: "/care", label: "Care" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { profile, isLoading, isError, error, refetch, update } = useSonaProfile();
  const [checkIn, setCheckIn] = useState(false);
  const navigate = useNavigate();
  const openCheckIn = useCallback(() => {
    window.dispatchEvent(new Event("sona:pause"));
    setCheckIn(true);
  }, []);
  const { minutesToday } = useActiveTime(openCheckIn, profile?.settings.checkIns ?? true);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background bg-glow-soft">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
          <Link to="/feed" className="heading-calm shrink-0 text-2xl tracking-wide">
            Sona
          </Link>
          <nav aria-label="Main" className="min-w-0 flex-1">
            <ul className="no-scrollbar mx-auto flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-ink p-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className="block whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm text-ink-foreground/70 transition hover:text-ink-foreground"
                    activeProps={{ className: "!bg-lime !text-lime-foreground" }}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            {profile && (
              <Link to="/profile" className="hidden size-10 items-center justify-center rounded-full border border-border bg-card sm:flex" aria-label="Your profile">
                <SonaFigure look={profile.look} pose="stand" noShadow className="h-9 w-7" />
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("mx-auto px-4 pb-32 pt-6 md:px-6 md:pt-10", wide ? "max-w-7xl" : "max-w-6xl")}>
        {isLoading ? (
          <div className="flex flex-col items-center py-24 text-center">
            <SonaFigure pose="rest" className="w-20 animate-bob" />
            <p className="subline mt-4">Getting your space ready…</p>
          </div>
        ) : isError || !profile ? (
          <div className="mx-auto max-w-md py-24 text-center">
            <SonaFigure pose="alert" className="mx-auto w-20" />
            <h1 className="heading-calm mt-4 text-3xl">Couldn't load your space</h1>
            <p className="subline mt-2">{error instanceof Error ? error.message : "Please try again."}</p>
            <Button variant="ink" className="mt-6" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <SonaProvider value={{ profile, update }}>
            {children}
            {profile.settings.sonaEnabled && <SonaHelper minutesToday={minutesToday} onRest={openCheckIn} />}
            {checkIn && <CheckInOverlay onClose={() => setCheckIn(false)} />}
          </SonaProvider>
        )}
      </main>
    </div>
  );
}

/** Calm uppercase page header with italic subline. */
export function PageHeader({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow?: string;
  title: string;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="eyebrow text-muted-foreground">{eyebrow}</p>}
        <h1 className="heading-calm mt-2 text-5xl md:text-7xl">{title}</h1>
        {sub && <p className="subline mt-3 max-w-xl text-lg">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
