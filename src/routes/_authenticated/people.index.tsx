import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Lock, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { AppShell, PageHeader } from "@/components/shell/AppShell";
import { PersonAvatar } from "@/components/social/Avatar";
import { useSearchPeople } from "@/hooks/use-social";

export const Route = createFileRoute("/_authenticated/people/")({
  head: () => ({
    meta: [
      { title: "Find people — Sona" },
      { name: "description", content: "Find friends on Sona and follow them." },
      { property: "og:title", content: "Find people — Sona" },
      { property: "og:description", content: "Search by name or handle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <People />
    </AppShell>
  ),
});

function People() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setTerm(q), 250);
    return () => window.clearTimeout(t);
  }, [q]);
  const res = useSearchPeople(term);

  return (
    <>
      <PageHeader eyebrow="Your people" title="Find people" sub="Follow friends. Private accounts approve requests first. Follow each other and you're in each other's Circle." />
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @handle" className="h-12 rounded-full pl-11" aria-label="Search people" autoFocus />
      </div>
      <ul className="mt-6 max-w-xl space-y-2">
        {term && res.data?.length === 0 && <li className="text-sm text-muted-foreground">Nobody by that name yet.</li>}
        {(res.data ?? []).map((p) => (
          <li key={p.id}>
            <Link to="/people/$id" params={{ id: p.id }} className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-card p-3 transition hover:border-foreground/40">
              <PersonAvatar path={p.avatar_path} name={p.display_name} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.display_name}</p>
                {p.handle && <p className="truncate text-xs text-muted-foreground">@{p.handle}</p>}
              </div>
              {p.is_public ? <Globe className="size-4 text-muted-foreground" aria-label="Public" /> : <Lock className="size-4 text-muted-foreground" aria-label="Private" />}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
