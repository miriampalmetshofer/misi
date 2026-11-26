"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatProduct } from "@/features/grocery/product";
import { fitVisualViewport } from "@/lib/fitVisualViewport";
import { saveRecipe } from "./actions";
import type { Recipe } from "./types";

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
  const [products, setProducts] = useState(
    recipe?.products.map(formatProduct).join("\n") ?? "",
  );
  const [suggestion, setSuggestion] = useState("");
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
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`${id}-ingredients`}
                    className="text-sm font-medium"
                  >
                    Zutaten
                  </label>
                  <textarea
                    id={`${id}-ingredients`}
                    name="products"
                    rows={5}
                    maxLength={3000}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring md:text-sm"
                    aria-describedby={`${id}-count-hint`}
                    placeholder={"2x Mozzarella\nTomatensauce"}
                    value={products}
                    onChange={(event) => setProducts(event.target.value)}
                  />
                  <p
                    id={`${id}-count-hint`}
                    className="text-xs text-muted-foreground"
                  >
                    Eine Zutat pro Zeile. Ohne Stückzahl gilt 1.
                  </p>
                </div>
                {knownProducts.length > 0 && (
                  <div className="flex gap-2">
                    <Input
                      aria-label="Bekannte Zutat suchen"
                      placeholder="Zutat suchen"
                      list={`${id}-suggestions`}
                      value={suggestion}
                      onChange={(event) => setSuggestion(event.target.value)}
                    />
                    <datalist id={`${id}-suggestions`}>
                      {knownProducts.map((product) => (
                        <option key={product} value={product} />
                      ))}
                    </datalist>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!knownProducts.includes(suggestion)}
                      onClick={() => {
                        setProducts(
                          [
                            products.trim(),
                            formatProduct({ name: suggestion, quantity: 1 }),
                          ]
                            .filter(Boolean)
                            .join("\n"),
                        );
                        setSuggestion("");
                      }}
                    >
                      Hinzufügen
                    </Button>
                  </div>
                )}
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
