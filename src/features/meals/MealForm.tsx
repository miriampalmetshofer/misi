"use client";

import { useId, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveMeal, deleteMeal } from "./actions";
import {
  personLabels,
  type MealEntry,
  type MealPerson,
  type MealTime,
} from "./types";

export function MealForm({
  entry,
  plannedOn,
  mealTime,
  onClose,
  context,
}: {
  entry?: MealEntry;
  plannedOn: string;
  mealTime: MealTime;
  onClose: () => void;
  context: string;
}) {
  const id = useId();
  const [name, setName] = useState(entry?.name ?? "");
  const [selected, setSelected] = useState({
    miriam: entry?.person !== "simon",
    simon: entry?.person !== "miriam",
  });
  const hasPerson = selected.miriam || selected.simon;
  const person: MealPerson =
    selected.miriam && selected.simon
      ? "both"
      : selected.miriam
        ? "miriam"
        : "simon";
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(remove = false) {
    if (pending || (!remove && !hasPerson)) return;
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        for (const [key, value] of Object.entries({
          plannedOn,
          mealTime,
          person,
          name,
        }))
          form.set(key, value);
        if (entry) form.set("id", entry.id);
        const result =
          remove && entry ? await deleteMeal(entry.id) : await saveMeal(form);
        if (result.error) setError(result.error);
        else onClose();
      } catch {
        setError(
          remove
            ? "Löschen fehlgeschlagen. Bitte erneut versuchen."
            : "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.",
        );
      }
    });
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup
            initialFocus
            className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none sm:p-6"
          >
            <Dialog.Title className="text-lg font-semibold">
              {entry ? "Essen bearbeiten" : "Essen eintragen"}
            </Dialog.Title>
            <Dialog.Description className="mb-5 mt-1 text-sm text-muted-foreground">
              {context}
            </Dialog.Description>
            <form
              aria-label={entry ? "Essen bearbeiten" : "Essen eintragen"}
              aria-busy={pending}
              onSubmit={(event) => {
                event.preventDefault();
                if (!confirmDelete && name.trim()) submit();
              }}
            >
              <fieldset
                disabled={pending}
                className="flex min-w-0 flex-col gap-3"
              >
                <label className="flex flex-col gap-1.5" htmlFor={`${id}-name`}>
                  <span className="text-sm font-medium">
                    Gericht oder Essen
                  </span>
                  <Input
                    id={`${id}-name`}
                    required
                    maxLength={200}
                    placeholder="z. B. Pasta oder Essen in der Arbeit"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <fieldset className="flex flex-wrap gap-2">
                  <legend className="mb-1.5 text-sm font-medium">
                    Für wen?
                  </legend>
                  {(["miriam", "simon"] as const).map((value) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-checked:border-foreground has-checked:bg-muted"
                    >
                      <input
                        type="checkbox"
                        name={`${id}-${value}`}
                        value={value}
                        checked={selected[value]}
                        onChange={(event) =>
                          setSelected({
                            ...selected,
                            [value]: event.target.checked,
                          })
                        }
                        className="size-4 accent-foreground"
                      />
                      {personLabels[value]}
                    </label>
                  ))}
                </fieldset>
                {!hasPerson ? (
                  <p className="text-sm text-destructive">
                    Wähle mindestens eine Person.
                  </p>
                ) : null}
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                {confirmDelete ? (
                  <div
                    className="flex flex-col gap-2"
                    role="group"
                    aria-label="Löschen bestätigen"
                  >
                    <p className="text-sm">Dieses Essen wirklich löschen?</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => submit(true)}
                      >
                        {pending ? "Wird gelöscht …" : "Endgültig löschen"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Zurück
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={!name.trim() || !hasPerson || pending}
                    >
                      {pending ? "Wird gespeichert …" : "Speichern"}
                    </Button>
                    <Dialog.Close
                      render={<Button type="button" variant="outline" />}
                    >
                      Abbrechen
                    </Dialog.Close>
                    {entry ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="ml-auto text-destructive"
                        onClick={() => setConfirmDelete(true)}
                      >
                        Löschen
                      </Button>
                    ) : null}
                  </div>
                )}
              </fieldset>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
