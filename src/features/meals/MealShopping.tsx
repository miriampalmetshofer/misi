"use client";

import { useId, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  MAX_PRODUCT_QUANTITY,
  validQuantity,
} from "@/features/grocery/product";
import { fitVisualViewport } from "@/lib/fitVisualViewport";
import { applyMealShopping, prepareMealShopping } from "./shoppingActions";
import type { ShoppingReviewRow } from "./products";

type Selection = ShoppingReviewRow & { selected: boolean; amount: string };

export function MealShopping({
  start,
  disabled,
}: {
  start: string;
  disabled: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Selection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, run] = useTransition();

  function load() {
    setRows(null);
    setError(null);
    setStale(false);
    setSaved(false);
    run(async () => {
      try {
        const review = await prepareMealShopping(start);
        setRows(
          review.map((row) => ({
            ...row,
            selected: !row.existing,
            amount: String(row.quantity),
          })),
        );
      } catch {
        setError(
          "Vorschau konnte nicht geladen werden. Bitte erneut versuchen.",
        );
      }
    });
  }

  function edit(
    index: number,
    change: Partial<Pick<Selection, "selected" | "amount">>,
  ) {
    setRows(
      (current) =>
        current?.map((row, i) => (i === index ? { ...row, ...change } : row)) ??
        null,
    );
  }

  const selected = rows?.filter((row) => row.selected) ?? [];
  const canApply =
    selected.length > 0 &&
    selected.every((row) => validQuantity(Number(row.amount)));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (nextOpen) load();
      }}
    >
      <Dialog.Trigger
        render={<Button variant="outline" className="self-start" />}
        disabled={disabled}
      >
        <ShoppingBasket aria-hidden="true" />
        Einkauf vorbereiten
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Viewport
          ref={fitVisualViewport}
          className="fixed inset-x-0 top-0 z-50 flex h-dvh items-center justify-center p-4"
        >
          <Dialog.Popup className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none">
            <Dialog.Title className="text-lg font-semibold">
              Einkauf vorbereiten
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Produkte für die angezeigte Woche. Wähle aus, was du übernehmen
              möchtest.
            </Dialog.Description>
            {pending && rows === null && (
              <p role="status" className="mt-4 text-sm">
                Vorschau wird geladen …
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            {saved ? (
              <p role="status" className="mt-4 text-sm">
                Auswahl übernommen.
              </p>
            ) : rows?.length === 0 ? (
              <p className="mt-4 text-sm">
                Für diese Woche sind noch keine Produkte hinterlegt.
              </p>
            ) : rows ? (
              <form
                id={id}
                className="mt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (pending || stale || !canApply) return;
                  setError(null);
                  run(async () => {
                    try {
                      const result = await applyMealShopping(
                        selected.map(({ name, amount, existing }) => ({
                          name,
                          quantity: Number(amount),
                          existing,
                        })),
                      );
                      if (result.error) {
                        setError(result.error);
                        setStale(result.stale === true);
                      } else {
                        setSaved(true);
                      }
                    } catch {
                      setError(
                        "Übernehmen fehlgeschlagen. Bitte erneut versuchen.",
                      );
                    }
                  });
                }}
              >
                <ul className="divide-y">
                  {rows.map((row, index) => (
                    <li
                      key={row.name}
                      className="grid grid-cols-[auto_minmax(0,1fr)_5rem] items-center gap-2 py-2"
                    >
                      <Checkbox
                        aria-labelledby={`${id}-name-${index}`}
                        className="size-5 border-muted-foreground"
                        checked={row.selected}
                        disabled={pending || stale}
                        onCheckedChange={(checked) =>
                          edit(index, { selected: checked })
                        }
                      />
                      <div>
                        <label
                          id={`${id}-name-${index}`}
                          htmlFor={`${id}-amount-${index}`}
                          className="block break-words text-sm font-medium"
                        >
                          {row.name}
                        </label>
                        {row.existing && (
                          <p className="text-xs text-muted-foreground">
                            {row.existing.quantity} auf der Liste ·{" "}
                            {row.quantity} für den Speiseplan
                          </p>
                        )}
                      </div>
                      <Input
                        id={`${id}-amount-${index}`}
                        aria-label={`Stückzahl für ${row.name}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_PRODUCT_QUANTITY}
                        required={row.selected}
                        value={row.amount}
                        disabled={!row.selected || pending || stale}
                        onChange={(event) =>
                          edit(index, { amount: event.target.value })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </form>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {saved ? (
                <Button
                  role="link"
                  nativeButton={false}
                  render={<Link href="/einkauf" />}
                >
                  Zur Einkaufsliste
                </Button>
              ) : stale || (error && rows === null) ? (
                <Button type="button" onClick={load} disabled={pending}>
                  Vorschau neu laden
                </Button>
              ) : rows && rows.length > 0 ? (
                <Button type="submit" form={id} disabled={!canApply || pending}>
                  {pending ? "Wird übernommen …" : "Auswahl übernehmen"}
                </Button>
              ) : null}
              <Dialog.Close
                render={<Button type="button" variant="outline" />}
                disabled={pending}
              >
                {saved ? "Schließen" : "Abbrechen"}
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
