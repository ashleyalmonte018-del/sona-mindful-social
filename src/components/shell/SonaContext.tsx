import { createContext, useContext, type ReactNode } from "react";

import type { SonaProfile } from "@/hooks/use-sona-profile";
import type { useSonaProfile } from "@/hooks/use-sona-profile";

type Ctx = { profile: SonaProfile; update: ReturnType<typeof useSonaProfile>["update"] };
const SonaCtx = createContext<Ctx | null>(null);

export function SonaProvider({ value, children }: { value: Ctx; children: ReactNode }) {
  return <SonaCtx.Provider value={value}>{children}</SonaCtx.Provider>;
}

export function useSona() {
  const v = useContext(SonaCtx);
  if (!v) throw new Error("useSona must be used inside AppShell");
  return v;
}
