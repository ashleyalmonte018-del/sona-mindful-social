import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import "@lovable.dev/cloud-auth-js/styles.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SonaFigure } from "@/components/sona/SonaFigure";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const search = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — Sona" },
      { name: "description", content: "Sign in or create your Sona account." },
      { property: "og:title", content: "Sign in — Sona" },
      { property: "og:description", content: "Your calmer feed is waiting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  if (!p) return "/feed";
  try {
    const u = new URL(p, window.location.origin);
    if (u.origin !== window.location.origin) return "/feed";
    return u.pathname + u.search;
  } catch {
    return "/feed";
  }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: safePath(redirect) });
    });
  }, [navigate, redirect]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: safePath(redirect) });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/feed", data: { display_name: name || undefined } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/feed" });
        else setSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    if (result.redirected) return;
    navigate({ to: safePath(redirect) });
  }

  return (
    <main className="min-h-screen bg-background bg-glow-soft px-6 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <Link to="/" className="heading-calm text-3xl">
          Sona
        </Link>
        <SonaFigure pose={sent ? "envelope" : mode === "in" ? "wave" : "cheer"} className="mt-6 w-24" />

        <div className="mt-4 w-full rounded-[2rem] border border-border bg-card/80 p-7 shadow-soft">
          {sent ? (
            <div className="text-center">
              <h1 className="heading-calm text-3xl">Check your inbox</h1>
              <p className="subline mt-3">
                We sent a confirmation link to {email}. Tap it and you'll land right in your feed.
              </p>
              <Button variant="soft" className="mt-6" onClick={() => setSent(false)}>
                Back
              </Button>
            </div>
          ) : (
            <>
              <h1 className="heading-calm text-center text-3xl">{mode === "in" ? "Welcome back" : "Join Sona"}</h1>
              <p className="subline mt-2 text-center">
                {mode === "in" ? "Your edition is waiting." : "A feed that filters before it reaches you."}
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === "up" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">What should we call you?</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="rounded-full" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-full"
                  />
                </div>
                <Button type="submit" variant="ink" size="lg" className="w-full" disabled={busy}>
                  {busy ? "One sec…" : mode === "in" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2">
                <Button variant="outline" size="lg" className="w-full" onClick={() => social("google")}>
                  Continue with Google
                </Button>
                <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
                  Continue with Lovable
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "in" ? "New here? " : "Already have an account? "}
                <button className="text-foreground underline underline-offset-4" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                  {mode === "in" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
