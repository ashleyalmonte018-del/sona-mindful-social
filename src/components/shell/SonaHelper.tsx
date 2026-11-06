import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { BreathingPrompt } from "@/components/shell/BreathingPrompt";
import { useSona } from "@/components/shell/SonaContext";
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
export function SonaHelper({ minutesToday, notifications = [] }: { minutesToday: number; notifications?: SonaNotification[] }) {
  const { profile } = useSona();
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [careNotification, setCareNotification] = useState(false);
  const [restDismissed, setRestDismissed] = useState(false);
  const [lastNotificationKey, setLastNotificationKey] = useState<string | null>(null);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const needsRest = minutesToday >= DAILY_GUIDE_MIN;
  const unread = notifications.filter((notification) => !notification.read);
  const newestUnread = unread[0];
  const newestNotificationKey = newestUnread ? `${newestUnread.id}:${newestUnread.createdAt}` : null;

  useEffect(() => {
    // Reaching the daily guide should inform the care view, but must not
    // hijack the notification center or leave it opened on the time widget.
    if (needsRest && !sessionStorage.getItem("sona.helperShown")) {
      setCareNotification(true);
      sessionStorage.setItem("sona.helperShown", "1");
    }
  }, [needsRest]);

  useEffect(() => {
    if (!newestNotificationKey || newestNotificationKey === lastNotificationKey) return;
    setLastNotificationKey(newestNotificationKey);
    setShowNotifications(true);
    setOpen(true);
  }, [lastNotificationKey, newestNotificationKey]);

  const pose = needsRest ? "rest" : "stand";

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
          {notifications.length > 0 && (
            <div className="mt-3 flex gap-1 rounded-full bg-secondary p-1">
              <button className={`flex-1 rounded-full px-2 py-1 text-xs ${showNotifications ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setShowNotifications(true)}>
                Notifications{unread.length > 0 ? ` (${unread.length})` : ""}
              </button>
              <button className={`flex-1 rounded-full px-2 py-1 text-xs ${!showNotifications ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setShowNotifications(false)}>
                Sona care
              </button>
            </div>
          )}
          {breathing ? (
            <BreathingPrompt seconds={30} onDone={() => { setBreathing(false); setCareNotification(false); setRestDismissed(true); setOpen(false); }} className="mt-4" />
          ) : showNotifications && notifications.length > 0 ? (
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
          ) : needsRest && !restDismissed ? (
            <>
              <p className="mt-2">
                You've been here {minutesToday} minutes today. Around {DAILY_GUIDE_MIN} a day is a healthy baseline — time for a rest?
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="lime" onClick={() => setBreathing(true)}>Take a breather</Button>
                <Button size="sm" variant="soft" onClick={() => { setRestDismissed(true); setCareNotification(false); setOpen(false); }}>Later</Button>
              </div>
            </>
          ) : (
            <p className="mt-2">{tip}</p>
          )}
        </div>
      )}
      <button
        onClick={() => { setOpen((o) => !o); setShowNotifications(notifications.length > 0); }}
        className="group relative rounded-full"
        aria-label={open ? "Close Sona Notification Center" : "Open Sona Notification Center"}
      >
        {(careNotification || unread.length > 0) && !open && <span className="absolute right-1 top-1 size-3 rounded-full border-2 border-background bg-lime" />}
        <SonaFigure look={profile.look} doodle={profile.doodle} pose={pose} className="w-16 animate-bob transition group-hover:scale-105" />
      </button>
    </div>
  );
}
