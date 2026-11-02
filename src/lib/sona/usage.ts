import { useEffect, useRef, useState } from "react";

// Local, per-device usage tracking for time-awareness nudges.
const dayKey = () => `sona.usage.${new Date().toISOString().slice(0, 10)}`;

export const CHECK_IN_EVERY_MIN = 15;
export const DAILY_GUIDE_MIN = 30;

export function readUsageSeconds(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(dayKey()) ?? 0) || 0;
}

/**
 * Counts active (visible-tab) seconds. Calls `onCheckIn` every 15 minutes of
 * active use, and exposes today's total minutes.
 */
export function useActiveTime(onCheckIn: () => void, enabled: boolean) {
  const [minutesToday, setMinutes] = useState(0);
  const sinceCheck = useRef(0);
  const cb = useRef(onCheckIn);
  cb.current = onCheckIn;

  useEffect(() => {
    setMinutes(Math.floor(readUsageSeconds() / 60));
    sinceCheck.current = Number(window.sessionStorage.getItem("sona.sinceCheck") ?? 0) || 0;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const total = readUsageSeconds() + 5;
      window.localStorage.setItem(dayKey(), String(total));
      setMinutes(Math.floor(total / 60));
      sinceCheck.current += 5;
      window.sessionStorage.setItem("sona.sinceCheck", String(sinceCheck.current));
      if (enabled && sinceCheck.current >= CHECK_IN_EVERY_MIN * 60) {
        sinceCheck.current = 0;
        window.sessionStorage.setItem("sona.sinceCheck", "0");
        cb.current();
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return { minutesToday };
}

// ---------- Feed edition progress (per device, per edition) ----------

export function editionKey(d = new Date()) {
  const half = d.getHours() < 15 ? "morning" : "evening";
  return `${d.toISOString().slice(0, 10)}.${half}`;
}
export function editionName(d = new Date()) {
  return d.getHours() < 15 ? "morning" : "evening";
}
export function nextEditionLabel(d = new Date()) {
  return d.getHours() < 15 ? "3 PM today" : "tomorrow morning";
}

export function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(`sona.seen.${editionKey()}`) ?? "[]");
  } catch {
    return [];
  }
}
export function writeSeen(ids: string[]) {
  window.localStorage.setItem(`sona.seen.${editionKey()}`, JSON.stringify(ids));
}

export function readRatings(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem("sona.ratings") ?? "{}");
  } catch {
    return {};
  }
}
export function writeRatings(r: Record<string, number>) {
  window.localStorage.setItem("sona.ratings", JSON.stringify(r));
}
