"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeItemName } from "@/features/grocery/categories";
import { fitVisualViewport } from "./fitVisualViewport";
import { formatProduct } from "@/features/grocery/product";
import { productsForDish, type DishProducts } from "./products";
import { saveMeal, deleteMeal } from "./actions";
import {
  personLabels,
  type MealEntry,
  type MealPerson,
  type MealTime,
} from "./types";

export function MealForm({
  entry,
  dishes,
  plannedOn,
  mealTime,
  onClose,
  context,
}: {
  entry?: MealEntry;
  dishes: DishProducts;
  plannedOn: string;
  mealTime: MealTime;
  onClose: () => void;
  context: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(entry?.name ?? "");
  const dishKey = normalizeItemName(name);
  const originalProducts = productsForDish(dishes, dishKey)
    .map(formatProduct)
    .join("\n");
  const [productDraft, setProductDraft] = useState<string | null>(null);
  const products =
    productDraft ??
    (entry && !Object.hasOwn(dishes, dishKey)
      ? productsForDish(dishes, normalizeItemName(entry.name))
          .map(formatProduct)
          .join("\n")
      : originalProducts);
  const knownProducts = [
    ...new Set(
      Object.values(dishes)
        .flat()
        .map((product) => product.name),
    ),
  ].sort((a, b) => a.localeCompare(b, "de-AT"));
  const [productSuggestion, setProductSuggestion] = useState("");
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
        if (products !== originalProducts) {
          form.set("products", products);
          form.set("originalProducts", originalProducts);
        }
        if (entry) {
          form.set("id", entry.id);
          form.set("version", String(entry.version));
        }
        const result =
          remove && entry
            ? await deleteMeal(entry.id, entry.version)
            : await saveMeal(form);
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
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Viewport
          ref={fitVisualViewport}
          className="fixed inset-x-0 top-0 z-50 flex h-dvh items-center justify-center p-4"
        >
          <Dialog.Popup
            ref={popupRef}
            initialFocus={entry ? popupRef : inputRef}
            className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none transition-opacity duration-150 data-starting-style:opacity-0 motion-reduce:transition-none sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <Dialog.Title className="text-lg font-semibold">
                {entry ? "Essen bearbeiten" : "Essen eintragen"}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Schließen"
                disabled={pending}
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-mr-2 -mt-1 size-10"
                  />
                }
              >
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
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
                    ref={inputRef}
                    autoFocus={!entry}
                    id={`${id}-name`}
                    required
                    maxLength={200}
                    placeholder="z. B. Pasta oder Essen in der Arbeit"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <details>
                  <summary className="cursor-pointer rounded-sm py-1 text-sm font-medium">
                    Produkte für den Einkauf
                  </summary>
                  <div className="mt-2 grid gap-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="sr-only">Produkte für den Einkauf</span>
                      <textarea
                        rows={3}
                        disabled={!dishKey}
                        maxLength={3000}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring md:text-sm"
                        placeholder={"2x Mozzarella\nTomatensauce"}
                        value={products}
                        onChange={(event) =>
                          setProductDraft(event.target.value)
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Ein Produkt pro Zeile. Ohne Stückzahl gilt 1.
                      </span>
                    </label>
                    {knownProducts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <Input
                          aria-label="Bekanntes Produkt suchen"
                          placeholder="Produkt suchen"
                          list={`${id}-products`}
                          value={productSuggestion}
                          onChange={(event) =>
                            setProductSuggestion(event.target.value)
                          }
                          className="w-auto flex-1"
                        />
                        <datalist id={`${id}-products`}>
                          {knownProducts.map((product) => (
                            <option key={product} value={product} />
                          ))}
                        </datalist>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            !dishKey ||
                            !knownProducts.includes(productSuggestion)
                          }
                          onClick={() => {
                            if (!knownProducts.includes(productSuggestion))
                              return;
                            setProductDraft(
                              [
                                products.trim(),
                                formatProduct({
                                  name: productSuggestion,
                                  quantity: 1,
                                }),
                              ]
                                .filter(Boolean)
                                .join("\n"),
                            );
                            setProductSuggestion("");
                          }}
                        >
                          Hinzufügen
                        </Button>
                      </div>
                    )}
                  </div>
                </details>
                <fieldset className="flex flex-wrap items-start gap-2">
                  <legend className="mb-1.5 text-sm font-medium">
                    Für wen?
                  </legend>
                  {(["miriam", "simon"] as const).map((value) => (
                    <label
                      key={value}
                      data-selected={selected[value]}
                      className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm data-[selected=true]:border-foreground data-[selected=true]:bg-muted"
                    >
                      <Checkbox
                        disabled={pending}
                        name={`${id}-${value}`}
                        value={value}
                        checked={selected[value]}
                        onCheckedChange={(checked) =>
                          setSelected({ ...selected, [value]: checked })
                        }
                        className="size-5 border-muted-foreground"
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
                    className="mt-3 flex flex-col gap-2"
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
                  <div className="mt-3 flex flex-wrap gap-2">
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
