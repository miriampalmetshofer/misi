"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_PRODUCT_NAME_LENGTH,
  MAX_PRODUCT_QUANTITY,
} from "@/features/grocery/product";
import { fitVisualViewport } from "@/lib/fitVisualViewport";
import { saveRecipe } from "./actions";
import { MAX_DISH_PRODUCTS, type Recipe } from "./types";

export function Recipes({ recipes }: { recipes: Recipe[] }) {
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);

  return (
    <section
      className="mt-6 flex flex-col items-start gap-4"
      aria-label="Rezeptsammlung"
    >
      <Button aria-haspopup="dialog" onClick={() => setEditing("new")}>
        <Plus aria-hidden="true" />
        Rezept hinzufügen
      </Button>
      {recipes.length ? (
        <ul className="w-full divide-y rounded-2xl border bg-card">
          {recipes.map((recipe) => (
            <li key={recipe.dishKey}>
              <button
                type="button"
                aria-label={`${recipe.name} bearbeiten`}
                aria-haspopup="dialog"
                onClick={() => setEditing(recipe)}
                className="flex min-h-12 w-full flex-col items-start gap-1 px-4 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="break-words font-medium">{recipe.name}</span>
                <span className="text-sm text-muted-foreground">
                  {recipe.products.length === 1
                    ? "1 Zutat"
                    : `${recipe.products.length} Zutaten`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Noch keine Rezepte gespeichert.
        </p>
      )}
      {editing && (
        <RecipeEditor
          recipe={editing === "new" ? undefined : editing}
          knownProducts={[
            ...new Set(
              recipes.flatMap(({ products }) =>
                products.map(({ name }) => name),
              ),
            ),
          ].sort((a, b) => a.localeCompare(b, "de-AT"))}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function RecipeEditor({
  recipe,
  knownProducts,
  onClose,
}: {
  recipe?: Recipe;
  knownProducts: string[];
  onClose: () => void;
}) {
  const id = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(recipe?.name ?? "");
  const [ingredients, setIngredients] = useState(() =>
    (recipe?.products.length
      ? recipe.products
      : [{ name: "", quantity: 1 }]
    ).map((product, index) => ({ ...product, id: index })),
  );
  const nextIngredient = useRef(ingredients.length);
  const addedIngredient = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useTransition();

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Viewport
          ref={fitVisualViewport}
          className="fixed inset-x-0 top-0 z-50 flex h-dvh items-center justify-center p-4"
        >
          <Dialog.Popup
            initialFocus={nameInput}
            className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none"
          >
            <div className="flex items-center justify-between gap-3">
              <Dialog.Title className="text-lg font-semibold">
                {recipe ? "Rezept bearbeiten" : "Rezept hinzufügen"}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Schließen"
                disabled={pending}
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-mr-2 size-10"
                  />
                }
              >
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <form
              className="mt-3"
              aria-busy={pending}
              onSubmit={(event) => {
                event.preventDefault();
                if (pending || !name.trim()) return;
                const data = new FormData(event.currentTarget);
                if (recipe) {
                  data.set("dishKey", recipe.dishKey);
                  data.set("version", String(recipe.version));
                }
                setError(null);
                run(async () => {
                  try {
                    const result = await saveRecipe(data);
                    if (result.error) setError(result.error);
                    else onClose();
                  } catch {
                    setError(
                      "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.",
                    );
                  }
                });
              }}
            >
              <fieldset
                disabled={pending}
                className="flex min-w-0 flex-col gap-3"
              >
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Rezeptname
                  <Input
                    ref={nameInput}
                    name="name"
                    required
                    maxLength={200}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-sm font-medium">Zutaten</legend>
                  {ingredients.length > 0 && (
                    <div
                      aria-hidden="true"
                      className="mb-1 grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] gap-2 text-xs text-muted-foreground"
                    >
                      <span>Produkt</span>
                      <span>Stück</span>
                    </div>
                  )}
                  <ul className="grid gap-2">
                    {ingredients.map((ingredient, index) => (
                      <li
                        key={ingredient.id}
                        className="grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] items-center gap-2"
                      >
                        <Input
                          ref={(input) => {
                            if (
                              input &&
                              addedIngredient.current === ingredient.id
                            ) {
                              addedIngredient.current = null;
                              input.focus();
                            }
                          }}
                          aria-label={`Produkt ${index + 1}`}
                          name="productName"
                          defaultValue={ingredient.name}
                          maxLength={MAX_PRODUCT_NAME_LENGTH}
                          list={
                            knownProducts.length
                              ? `${id}-suggestions`
                              : undefined
                          }
                          placeholder="z. B. Mozzarella"
                        />
                        <Input
                          aria-label={`Stückzahl ${index + 1}`}
                          name="productQuantity"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={MAX_PRODUCT_QUANTITY}
                          step={1}
                          required
                          defaultValue={ingredient.quantity}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Zutat ${index + 1} entfernen`}
                          onClick={() =>
                            setIngredients((rows) =>
                              rows.filter(({ id }) => id !== ingredient.id),
                            )
                          }
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <datalist id={`${id}-suggestions`}>
                    {knownProducts.map((product) => (
                      <option key={product} value={product} />
                    ))}
                  </datalist>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    disabled={ingredients.length >= MAX_DISH_PRODUCTS}
                    onClick={() => {
                      const id = nextIngredient.current++;
                      addedIngredient.current = id;
                      setIngredients((rows) => [
                        ...rows,
                        { id, name: "", quantity: 1 },
                      ]);
                    }}
                  >
                    <Plus aria-hidden="true" />
                    Zutat hinzufügen
                  </Button>
                </fieldset>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="submit" disabled={!name.trim()}>
                    {pending ? "Wird gespeichert …" : "Speichern"}
                  </Button>
                  <Dialog.Close
                    render={<Button type="button" variant="outline" />}
                    disabled={pending}
                  >
                    Abbrechen
                  </Dialog.Close>
                </div>
              </fieldset>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
