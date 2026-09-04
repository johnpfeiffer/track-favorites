import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { FavoritesView } from "./App";
import type { TrackedItem } from "../models/trackedItem";

const item: TrackedItem = {
  _id: "item-1",
  userId: "f47ac10b-58cc-11cf-a447-001122334455",
  uniqueId: "https://example.com/article",
  status: "todo",
  dateStarted: "2026-08-11T12:00:00.000Z",
  dateUpdated: "2026-08-11T12:00:00.000Z",
};

describe("FavoritesView", () => {
  test("shows explicit loading and empty states", () => {
    const { rerender } = render(
      <FavoritesView
        items={undefined}
        onAdd={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "My favorite links" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Add a favorite" }),
    ).toBeInTheDocument();

    rerender(
      <FavoritesView
        items={[]}
        onAdd={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    expect(screen.getByText("No favorites yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Find your next thing" }),
    ).toHaveAttribute("href", "https://feneky.com/links");
    expect(
      screen.getByRole("link", { name: "View favorites graph" }),
    ).toHaveAttribute("href", "graph");
    expect(
      screen.queryByText("Keep track of what you finish"),
    ).not.toBeInTheDocument();
  });

  test("submits the exact URL with the selected initial status", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <FavoritesView
        items={[]}
        onAdd={onAdd}
        onStatusChange={vi.fn()}
      />,
    );

    const submittedUrl = "https://Example.com/article/?ref=Favorites";
    await user.type(screen.getByLabelText("Link URL"), submittedUrl);
    expect(screen.getByLabelText("Initial status")).toHaveValue("todo");
    await user.selectOptions(
      screen.getByLabelText("Initial status"),
      "completed",
    );
    await user.click(screen.getByRole("button", { name: "Add favorite" }));

    expect(onAdd).toHaveBeenCalledWith(submittedUrl, "completed");
  });

  test("confirms cancellation before changing status", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn().mockResolvedValue(undefined);
    render(
      <FavoritesView
        items={[item]}
        onAdd={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );

    expect(screen.queryByText("Link details")).not.toBeInTheDocument();
    const status = screen.getByLabelText(`Status for ${item.uniqueId}`);
    await user.selectOptions(status, "todo");
    expect(onStatusChange).not.toHaveBeenCalled();

    await user.selectOptions(status, "cancelled");

    expect(onStatusChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Cancel favorite?" })).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Keep current status" }),
    );
    expect(onStatusChange).not.toHaveBeenCalled();

    await user.selectOptions(status, "cancelled");
    await user.click(screen.getByRole("button", { name: "Cancel favorite" }));
    expect(onStatusChange).toHaveBeenCalledWith(item._id, "cancelled");
  });

  test("dismisses cancellation with Escape and restores focus without changing status", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn().mockResolvedValue(undefined);
    render(
      <FavoritesView
        items={[item]}
        onAdd={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );

    const status = screen.getByRole("combobox", {
      name: `Status for ${item.uniqueId}`,
    });
    await user.selectOptions(status, "cancelled");
    const dialog = screen.getByRole("dialog", { name: "Cancel favorite?" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(onStatusChange).not.toHaveBeenCalled();
    expect(status).toHaveValue("todo");
    expect(status).toHaveFocus();
  });

  test("collapses the listing and sorts by date or ID", async () => {
    const user = userEvent.setup();
    const older: TrackedItem = {
      ...item,
      _id: "item-a",
      uniqueId: "https://example.com/a",
      dateUpdated: "2026-08-10T12:00:00.000Z",
    };
    const newer: TrackedItem = {
      ...item,
      _id: "item-z",
      uniqueId: "https://example.com/z",
      dateUpdated: "2026-08-11T12:00:00.000Z",
    };
    render(
      <FavoritesView
        items={[older, newer]}
        onAdd={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByRole("link", { name: /https:\/\/example\.com/ })
        .map((link) => link.textContent),
    ).toEqual([newer.uniqueId, older.uniqueId]);

    await user.selectOptions(screen.getByLabelText("Sort by"), "id");
    await user.selectOptions(screen.getByLabelText("Direction"), "asc");
    expect(
      screen
        .getAllByRole("link", { name: /https:\/\/example\.com/ })
        .map((link) => link.textContent),
    ).toEqual([older.uniqueId, newer.uniqueId]);

    await user.click(screen.getByRole("button", { name: "Collapse list" }));
    expect(
      screen.queryByRole("link", { name: older.uniqueId }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand list" }));
    expect(
      screen.getByRole("link", { name: older.uniqueId }),
    ).toBeInTheDocument();
  });

  test("shows a duplicate error returned by the controller", async () => {
    const user = userEvent.setup();
    const onAdd = vi
      .fn()
      .mockRejectedValue(new Error("This link is already being tracked."));
    render(
      <FavoritesView
        items={[]}
        onAdd={onAdd}
        onStatusChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Link URL"), item.uniqueId);
    await user.click(screen.getByRole("button", { name: "Add favorite" }));

    expect(
      await screen.findByText("This link is already being tracked."),
    ).toBeInTheDocument();
  });
});
