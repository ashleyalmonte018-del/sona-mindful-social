import { createFileRoute, redirect } from "@tanstack/react-router";

// The Zone now lives inside the Circle page; keep old links working.
export const Route = createFileRoute("/_authenticated/zone")({
  beforeLoad: () => {
    throw redirect({ to: "/circle", replace: true });
  },
});
