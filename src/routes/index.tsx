import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { SonaFigure } from "@/components/sona/SonaFigure";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sona — your feed, filtered before it reaches you" },
      {
        name: "description",
        content:
          "Sona is a calmer Gen Z social feed: curate what gets through, tune your algorithm with dials, soften sensitive posts and share just enough.",
      },
      { property: "og:title", content: "Sona — your feed, filtered before it reaches you" },
      {
        property: "og:description",
        content: "Curate what gets through, tune with dials instead of guesswork, and meet your Sona helper.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { title: "Curate", line: "decide what gets through" },
  { title: "Vibe", line: "dials, not guesswork" },
  { title: "Circle", line: "share just enough" },
  { title: "Minigames", line: "play with your circle's Sonas" },
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background bg-glow">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center px-6 pt-10 md:pt-14">
        <p className="eyebrow text-foreground/80">Welcome to</p>

        <div className="relative mt-3">
          <h1 className="heading-calm text-[22vw] leading-[0.82] text-foreground md:text-[12rem]">Sona</h1>
          <SonaFigure pose="envelope" className="absolute -left-20 top-6 hidden w-20 md:block" look={{ name: "Mail Sona" }} />
          <SonaFigure pose="megaphone" className="absolute -right-16 -top-8 hidden w-20 md:block" look={{ name: "Loud Sona" }} />
        </div>

        <p className="subline mt-4 text-center text-lg text-foreground/80 md:text-2xl">
          Your feed, filtered before it reaches you.
        </p>

        <div className="relative mt-14 w-full max-w-3xl md:mt-20">
          <SonaFigure pose="run" className="absolute -left-6 -top-24 hidden w-20 md:block" noShadow />
          <SonaFigure pose="read" className="absolute -right-2 -top-[5.6rem] w-16 md:right-8 md:w-20" noShadow />
          <Button asChild variant="pill" size="xl" className="w-full">
            <Link to="/feed">Get started</Link>
          </Button>
          <SonaFigure pose="cheer" className="absolute left-[18%] top-[88%] hidden w-20 md:block" noShadow />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>

        <ul className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-6 md:mt-24 md:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="text-center">
              <p className="heading-calm text-2xl">{f.title}</p>
              <p className="subline mt-1 text-sm">{f.line}</p>
            </li>
          ))}
        </ul>

        <div className="pointer-events-none relative mt-10 h-44 w-full max-w-5xl">
          <SonaFigure pose="jump" className="absolute bottom-2 left-[4%] w-20 animate-bob" />
          <SonaFigure pose="box" className="absolute bottom-0 left-[38%] w-20" />
          <SonaFigure pose="alert" className="absolute bottom-0 left-[64%] hidden w-20 sm:block" />
          <SonaFigure pose="sit" className="absolute bottom-0 right-[2%] w-20" />
        </div>
      </div>
    </main>
  );
}
