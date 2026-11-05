import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { MealPlanner } from "./MealPlanner";
import { saveMeal, deleteMeal } from "./actions";

vi.mock("./actions", () => ({ saveMeal: vi.fn(), deleteMeal: vi.fn() }));
const props = { start: "2026-11-02", today: "2026-11-02", entries: [] };
beforeEach(() => {
  vi.mocked(saveMeal).mockReset().mockResolvedValue({ error: null });
  vi.mocked(deleteMeal).mockReset().mockResolvedValue({ error: null });
});

it("prefills the selected day and meal, defaults to both, and permits a personal meal", async () => {
  const user = userEvent.setup();
  render(<MealPlanner {...props} />);
  const monday = within(
    screen.getByRole("region", { name: "Montag, 2. November" }),
  );
  await user.click(
    monday.getByRole("button", { name: "Mittagessen eintragen" }),
  );
  expect(
    screen.getByRole("dialog", { name: "Essen eintragen" }),
  ).toHaveTextContent("Montag Mittag");
  expect(screen.getByRole("checkbox", { name: "Miriam" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Simon" })).toBeChecked();
  await user.type(
    screen.getByLabelText("Gericht oder Essen"),
    "Essen in der Arbeit",
  );
  await user.click(screen.getByRole("checkbox", { name: "Simon" }));
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  const data = vi.mocked(saveMeal).mock.calls[0][0];
  expect(Object.fromEntries(data)).toEqual({
    plannedOn: "2026-11-02",
    mealTime: "lunch",
    person: "miriam",
    name: "Essen in der Arbeit",
  });
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});

it("keeps input after a failed save and allows retrying", async () => {
  vi.mocked(saveMeal).mockResolvedValueOnce({
    error: "Speichern fehlgeschlagen",
  });
  const user = userEvent.setup();
  render(<MealPlanner {...props} />);
  await user.click(
    screen.getAllByRole("button", { name: "Abendessen eintragen" })[0],
  );
  await user.type(screen.getByLabelText("Gericht oder Essen"), "Curry");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Speichern fehlgeschlagen",
  );
  expect(screen.getByLabelText("Gericht oder Essen")).toHaveValue("Curry");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});

it("edits an existing meal and confirms deletion before writing", async () => {
  const user = userEvent.setup();
  render(
    <MealPlanner
      {...props}
      entries={[
        {
          id: "meal-1",
          version: 1,
          plannedOn: "2026-11-02",
          mealTime: "dinner",
          person: "simon",
          name: "Pasta",
        },
      ]}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Pasta bearbeiten" }));
  expect(screen.getByRole("checkbox", { name: "Simon" })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Löschen" }));
  expect(deleteMeal).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Zurück" }));
  await user.click(screen.getByRole("button", { name: "Abbrechen" }));
  expect(deleteMeal).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Pasta bearbeiten" }));
  await user.click(screen.getByRole("button", { name: "Löschen" }));
  await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));
  expect(deleteMeal).toHaveBeenCalledWith("meal-1");
});

it("requires at least one person", async () => {
  const user = userEvent.setup();
  render(<MealPlanner {...props} />);
  await user.click(
    screen.getAllByRole("button", { name: "Mittagessen eintragen" })[0],
  );
  await user.type(screen.getByLabelText("Gericht oder Essen"), "Pasta");
  await user.click(screen.getByRole("checkbox", { name: "Miriam" }));
  await user.click(screen.getByRole("checkbox", { name: "Simon" }));
  expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
  expect(saveMeal).not.toHaveBeenCalled();
  await user.click(screen.getByRole("checkbox", { name: "Miriam" }));
  expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
});

it("collapses only past days in the current week and lets them be reopened", async () => {
  const user = userEvent.setup();
  render(<MealPlanner {...props} today="2026-11-05" />);
  const monday = within(
    screen.getByRole("region", { name: "Montag, 2. November" }),
  );
  const toggle = monday.getByRole("button", { name: /Montag/ });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(
    monday.queryByRole("button", { name: "Mittagessen eintragen" }),
  ).not.toBeInTheDocument();
  const thursday = within(
    screen.getByRole("region", { name: "Donnerstag, 5. November" }),
  );
  expect(
    thursday.getByRole("button", { name: "Mittagessen eintragen" }),
  ).toBeVisible();
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(
    monday.getByRole("button", { name: "Mittagessen eintragen" }),
  ).toBeVisible();
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
});

it("keeps days expanded when browsing a different week", () => {
  render(<MealPlanner {...props} start="2026-10-26" today="2026-11-05" />);
  expect(
    screen.getAllByRole("button", { name: "Mittagessen eintragen" }),
  ).toHaveLength(7);
  expect(
    screen.queryByRole("button", { expanded: false }),
  ).not.toBeInTheDocument();
});

it("shows the viewed range between the arrows and a separate return link only outside the current week", () => {
  const { rerender } = render(<MealPlanner {...props} />);
  expect(
    screen.queryByRole("link", { name: "Zur aktuellen Woche" }),
  ).not.toBeInTheDocument();
  rerender(<MealPlanner {...props} start="2026-11-09" />);
  expect(
    screen.getByRole("heading", { name: "9.–15. Nov. 2026" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Zur aktuellen Woche" }),
  ).toHaveAttribute("href", "/speiseplan?woche=2026-11-02");
});

it("retains the older form and its inputs when another edit won", async () => {
  vi.mocked(saveMeal).mockResolvedValueOnce({
    error: "Dieser Eintrag wurde inzwischen geändert oder gelöscht.",
  });
  const user = userEvent.setup();
  render(
    <MealPlanner
      {...props}
      entries={[
        {
          id: "meal-1",
          version: 3,
          plannedOn: "2026-11-02",
          mealTime: "dinner",
          person: "both",
          name: "Pasta",
        },
      ]}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Pasta bearbeiten" }));
  await user.click(screen.getByRole("checkbox", { name: "Miriam" }));
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "inzwischen geändert",
  );
  expect(screen.getByLabelText("Gericht oder Essen")).toHaveValue("Pasta");
  expect(screen.getByRole("checkbox", { name: "Simon" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Miriam" })).not.toBeChecked();
  expect(
    Object.fromEntries(vi.mocked(saveMeal).mock.calls[0][0]),
  ).toMatchObject({
    id: "meal-1",
    version: "3",
    name: "Pasta",
    person: "simon",
  });
});

it("focuses the input only when adding a meal", async () => {
  const user = userEvent.setup();
  render(
    <MealPlanner
      {...props}
      entries={[
        {
          id: "meal-1",
          version: 1,
          plannedOn: "2026-11-02",
          mealTime: "dinner",
          person: "both",
          name: "Pasta",
        },
      ]}
    />,
  );
  await user.click(
    screen.getAllByRole("button", { name: "Mittagessen eintragen" })[0],
  );
  expect(screen.getByLabelText("Gericht oder Essen")).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Schließen" }));
  await user.click(screen.getByRole("button", { name: "Pasta bearbeiten" }));
  expect(screen.getByLabelText("Gericht oder Essen")).not.toHaveFocus();
  expect(screen.getByRole("dialog")).toHaveFocus();
});
