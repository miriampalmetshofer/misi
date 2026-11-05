import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { MealPlanner } from "./MealPlanner";
import { saveMeal, deleteMeal } from "./actions";

vi.mock("./actions", () => ({ saveMeal: vi.fn(), deleteMeal: vi.fn() }));
const props = { start: "2026-11-02", today: "2026-11-05", entries: [] };
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
