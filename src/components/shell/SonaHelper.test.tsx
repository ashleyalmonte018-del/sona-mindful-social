import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SonaHelper, type SonaNotification } from "@/components/shell/SonaHelper";

vi.mock("@/components/shell/SonaContext", () => ({
  useSona: () => ({ profile: { look: { name: "Sona" }, doodle: null } }),
}));

vi.mock("@/components/sona/SonaFigure", () => ({
  SonaFigure: () => <div aria-hidden="true">Sona</div>,
}));

describe("SonaHelper notifications", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("reopens for a resent notification that reuses its row id", async () => {
    const notification: SonaNotification = {
      id: "invite-1",
      title: "Game invitation",
      body: "A friend invited you to a game.",
      createdAt: "2026-11-05T12:00:00.000Z",
      read: false,
    };
    const view = render(<SonaHelper minutesToday={0} notifications={[notification]} />);

    expect(await screen.findByText(notification.body)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(notification.body)).not.toBeInTheDocument();

    view.rerender(<SonaHelper minutesToday={0} notifications={[{ ...notification, read: true }]} />);
    view.rerender(
      <SonaHelper
        minutesToday={0}
        notifications={[{ ...notification, createdAt: "2026-11-05T12:01:00.000Z", read: false }]}
      />,
    );

    await waitFor(() => expect(screen.getByText(notification.body)).toBeInTheDocument());
  });
});
