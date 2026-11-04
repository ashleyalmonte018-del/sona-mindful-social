import { SonaFigure } from "@/components/sona/SonaFigure";
import { useSignedUrl } from "@/hooks/use-social";
import type { Json } from "@/integrations/supabase/types";
import { mergeLook } from "@/lib/sona/types";
import { cn } from "@/lib/utils";

/** Uploaded avatar, or the person's Sona as a fallback. */
export function PersonAvatar({
  path,
  sona,
  name,
  className,
}: {
  path: string | null | undefined;
  sona?: Json | null | undefined;
  name: string;
  className?: string;
}) {
  const url = useSignedUrl("profile-media", path);
  return (
    <div className={cn("flex shrink-0 items-end justify-center overflow-hidden rounded-full border border-border bg-secondary", className)}>
      {path && url.data ? (
        <img src={url.data} alt={`${name}'s picture`} className="size-full object-cover" />
      ) : sona !== undefined ? (
        <SonaFigure look={mergeLook(sona)} pose="stand" noShadow className="-mb-[12%] h-[115%]" />
      ) : (
        <span className="flex size-full items-center justify-center text-sm font-medium uppercase text-secondary-foreground">{name.slice(0, 1)}</span>
      )}
    </div>
  );
}
