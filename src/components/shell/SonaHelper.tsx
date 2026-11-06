import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { MoodPicker } from "@/components/shell/MoodPicker";
import { useSona } from "@/components/shell/SonaContext";
import { useMoods } from "@/hooks/use-sona-profile";
import { DAILY_GUIDE_MIN } from "@/lib/sona/usage";

const TIPS = [
  "Drink some water? I'll wait 💧",
  "Your feed ends on purpose. That's the point.",
  "Text someone you miss today.",
  "Shoulders down, jaw unclenched.",
];

export interface SonaNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read?: boolean;
  kind?: string;
  onOpen?: () => void;
}

/** The floating Sona buddy and the Sona Notification Center. */
export function SonaHelper({ minutesToday, onRest, notifications = [] }: { minutesToday: number; onRest: () => void; notifications?: SonaNotification[] }) {
  const { profile } = useSona();
  const { checkedInToday, log, isLoading } = useMoods();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const needsRest = minutesToday >= DAILY_GUIDE_MIN;
  const needsCheckIn = !isLoading && !checkedInToday;
  const unread = notifications.filter((notification) => !notification.read);
  const newestUnread = unread[0];

  useEffect(() => {
    if (sessionStorage.getItem("sona.helperShown")) return;
    if (needsCheckIn || needsRest) {
      setOpen(true);
      sessionStorage.setItem("sona.helperShown", "1");
    }
  }, [needsCheckIn, needsRest]);

  useEffect(() => {
    if (!newestUnread || newestUnread.id === lastNotificationId) return;
    setLastNotificationId(newestUnread.id);
    setOpen(true);
  }, [lastNotificationId, newestUnread]);

  const pose = needsRest ? "rest" : needsCheckIn ? "wave" : "stand";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 rounded-3xl border border-border bg-popover p-4 text-sm shadow-float animate-pop">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="eyebrow text-muted-foreground">Sona Notification Center</p>
              <p className="mt-1 text-xs text-muted-foreground">{profile.look.name || "Your Sona"}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          {newestUnread && !historyOpen ? (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-lime-foreground">
                <Bell className="size-4" />
                <span className="eyebrow">New notification</span>
              </div>
              <button
                className="mt-2 w-full rounded-2xl bg-secondary p-3 text-left transition hover:bg-secondary/70"
                onClick={() => { newestUnread.onOpen?.(); setOpen(false); }}
              >
                <p className="font-medium">{newestUnread.title}</p>
                <p className="mt-1 text-muted-foreground">{newestUnread.body}</p>
              </button>
              <button className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setHistoryOpen(true)}>
                View notification history
              </button>
            </div>
          ) : historyOpen || notifications.length > 0 ? (
            <div className="mt-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">All notifications</p>
                {unread.length > 0 && <span className="rounded-full bg-lime px-2 py-0.5 text-[0.65rem] text-lime-foreground">{unread.length} new</span>}
              </div>
              {notifications.length > 0 ? (
                <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className="w-full rounded-2xl bg-secondary p-3 text-left transition hover:bg-secondary/70"
                      onClick={() => { notification.onOpen?.(); setOpen(false); }}
                    >
                      <p className="font-medium">{notification.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.body}</p>
                      <time className="mt-2 block text-[0.65rem] text-muted-foreground" dateTime={notification.createdAt}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </time>
                    </button>
                  ))}
                </div>
              ) : <p className="mt-3 text-muted-foreground">No notifications yet.</p>}
            </div>
          ) : needsRest ? (
            <>
              <p className="mt-2">
                You've been here {minutesToday} minutes today. Around {DAILY_GUIDE_MIN} a day is a healthy baseline — time for a rest?
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="lime" onClick={() => { setOpen(false); onRest(); }}>Take a breather</Button>
                <Button size="sm" variant="soft" onClick={() => setOpen(false)}>Later</Button>
              </div>
            </>
          ) : needsCheckIn ? (
            <>
              <p className="mt-2">Hey {profile.displayName}! Daily check-in — how are you, really?</p>
              <div className="mt-3">
                <MoodPicker
                  size="sm"
                  onPick={(m) => {
                    log.mutate({ mood: m, source: "daily" });
                    setOpen(false);
                  }}
                />
              </div>
            </>
          ) : (
            <p className="mt-2">{tip}</p>
          )}
        </div>
      )}
      <button
        onClick={() => { setOpen((o) => !o); setHistoryOpen(notifications.length > 0); }}
        className="group relative rounded-full"
        aria-label={open ? "Close Sona Notification Center" : "Open Sona Notification Center"}
      >
        {(needsCheckIn || needsRest || unread.length > 0) && !open && <span className="absolute right-1 top-1 size-3 rounded-full border-2 border-background bg-lime" />}
        <SonaFigure look={profile.look} doodle={profile.doodle} pose={pose} className="w-16 animate-bob transition group-hover:scale-105" />
      </button>
    </div>
  );
}
