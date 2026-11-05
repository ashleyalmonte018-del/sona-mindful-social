import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { CheckInOverlay } from "@/components/shell/CheckInOverlay";
import { SonaHelper } from "@/components/shell/SonaHelper";
import { SonaProvider } from "@/components/shell/SonaContext";
import { useSonaProfile } from "@/hooks/use-sona-profile";
import { useFollowRequests } from "@/hooks/use-social";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme, DEFAULT_THEME } from "@/lib/sona/theme";
import { useActiveTime } from "@/lib/sona/usage";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/feed", label: "Feed" },
  { to: "/studio", label: "Studio" },
  { to: "/curate", label: "Curate" },
  { to: "/vibe", label: "Vibe" },
  { to: "/circle", label: "Circle" },
  { to: "/care", label: "Care" },
  { to: "/profile", label: "Profile" },
  { to: "/accountability", label: "Accountability" },
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

  // Turn notifications remain available after the game dialog is closed.
  const turnNotifications = useQuery({
    queryKey: ["game-turn-notifications", profile?.id],
    enabled: Boolean(profile?.id),
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("id,title,body,match_id,created_at").eq("recipient_id", profile!.id).eq("kind", "game_turn").is("read_at", null).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
  const notificationClient = useQueryClient();
  const shownTurnNotifications = useRef(new Set<string>());
  useEffect(() => {
    if (!turnNotifications.data) return;
    for (const notification of turnNotifications.data) {
      if (shownTurnNotifications.current.has(notification.id)) continue;
      shownTurnNotifications.current.add(notification.id);
      toast(notification.title, { description: notification.body, action: { label: "Open Circle", onClick: () => navigate({ to: "/circle" }) } });
      void supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id);
    }
  }, [turnNotifications.data, navigate]);
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase.channel(`game-notifications:${profile.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${profile.id}` }, () => {
      void notificationClient.invalidateQueries({ queryKey: ["game-turn-notifications", profile.id] });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile?.id, notificationClient]);

  // Follow-request notifications: a badge on Profile, plus a gentle toast when a new one arrives.
  const requests = useFollowRequests(profile?.id, { poll: true });
  const pendingCount = requests.data?.length ?? 0;
  const lastCount = useRef<number | null>(null);
  useEffect(() => {
    if (!requests.isSuccess) return;
    if (lastCount.current !== null && pendingCount > lastCount.current) {
      const who = requests.data[0]?.person?.display_name ?? "Someone";
      toast(`${who} asked to follow you`, { action: { label: "Review", onClick: () => navigate({ to: "/profile" }) } });
    }
    lastCount.current = pendingCount;
  }, [pendingCount, requests.isSuccess, requests.data, navigate]);
    const [snoozed, setSnoozed] = useState(false);
  const timeLimit = profile?.settings.timeLimit ?? 45;
  const isLimitReached = Boolean(
    profile?.settings.accountability &&
    timeLimit > 0 &&
    minutesToday >= timeLimit &&
    !snoozed
  );


  // Keep <html> in sync with the saved theme (preset / custom colour / dark mode).
  const theme = profile?.settings.theme;
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  async function signOut() {
    applyTheme(DEFAULT_THEME);
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background bg-glow-soft bg-grain">
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
                    {n.to === "/profile" && pendingCount > 0 && (
                      <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[0.65rem] font-medium text-lime-foreground" aria-label={`${pendingCount} follow requests`}>
                        {pendingCount}
                      </span>
                    )}
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
            {checkIn && <CheckInOverlay onClose={() => setCheckIn(false)} />}             {isLimitReached && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-md"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="limit-title"
              >
                <div className="w-full max-w-md rounded-[2.5rem] border border-border bg-card p-8 text-center shadow-xl">
                  <SonaFigure look={profile.look} doodle={profile.doodle} pose="sleep" className="mx-auto w-24" />
                  <p className="eyebrow mt-4 text-lime-foreground">Time for closure</p>
                  <h2 id="limit-title" className="heading-calm mt-2 text-3xl">
                    Daily limit reached ({timeLimit}m)
                  </h2>
                  <p className="subline mt-3 text-muted-foreground">
                    You hit your mindful threshold for today. The feed will be waiting for you tomorrow.
                  </p>

                  <div className="mt-6 flex flex-col gap-2">
                    <Button 
                      variant="ink" 
                      className="w-full rounded-full py-3"
                      onClick={() => navigate({ to: "/accountability" })}
                    >
                      View Accountability stats
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSnoozed(true)}
                    >
                      Snooze for 5 more minutes
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
