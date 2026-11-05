import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/social/Avatar";
import { useFollowers } from "@/hooks/use-social";

export function FollowersDialog({
  ownerId,
  ownerName,
  open,
  onOpenChange,
}: {
  ownerId: string;
  ownerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: followers, isLoading } = useFollowers(ownerId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{ownerName}'s followers</DialogTitle>
          <DialogDescription>People who follow this Sona.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (followers ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No followers to show yet.</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {(followers ?? []).map((f) => (
              <li key={f.id}>
                <Link
                  to="/people/$id"
                  params={{ id: f.id }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary"
                  onClick={() => onOpenChange(false)}
                >
                  <PersonAvatar path={f.avatar_path} name={f.display_name} className="size-10" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{f.display_name}</span>
                    {f.handle && <span className="block truncate text-xs text-muted-foreground">@{f.handle}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
