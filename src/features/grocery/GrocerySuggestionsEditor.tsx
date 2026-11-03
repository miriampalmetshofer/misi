"use client";

import { useRef, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveGrocerySuggestions } from "./actions";

export function GrocerySuggestionsEditor({
  categoryId,
  categoryName,
  suggestions,
  onClose,
}: {
  categoryId: string;
  categoryName: string;
  suggestions: string[];
  onClose: () => void;
}) {
  const [original] = useState(suggestions);
  const [items, setItems] = useState(() =>
    suggestions.map((name, id) => ({ id, name })),
  );
  const nextId = useRef(suggestions.length);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const popup = useRef<HTMLDivElement>(null);

  function addSuggestion() {
    if (!newName.trim() || items.length >= 30) return;
    setItems([...items, { id: nextId.current++, name: newName.trim() }]);
    setNewName("");
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup
          ref={popup}
          initialFocus={popup}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[85dvh] max-w-md overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
        >
          <form
            className="flex max-h-[85dvh] flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData();
              data.set("categoryId", categoryId);
              data.set("original", JSON.stringify(original));
              const names = items.map((item) => item.name);
              if (newName.trim()) names.push(newName.trim());
              data.set("suggestions", names.join("\n"));
              setError("");
              startTransition(async () => {
                try {
                  const result = await saveGrocerySuggestions(data);
                  if (result.error) setError(result.error);
                  else onClose();
                } catch {
                  setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
                }
              });
            }}
          >
            <div className="flex shrink-0 items-start gap-3 border-b p-4">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-lg font-semibold">Vorschläge bearbeiten</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground break-words">
                  {categoryName} · {items.length}/30 Vorschläge
                </Dialog.Description>
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Schließen" disabled={isPending} onClick={onClose}>
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine Vorschläge. Füge deinen ersten Artikel hinzu.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((item, index) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <Input
                        aria-label={`Vorschlag ${index + 1}`}
                        value={item.name}
                        maxLength={80}
                        required
                        disabled={isPending}
                        className="h-11"
                        onChange={(event) => setItems(items.map((entry) =>
                          entry.id === item.id ? { ...entry, name: event.target.value } : entry,
                        ))}
                      />
                      <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" aria-label={`Vorschlag ${index + 1} entfernen`} disabled={isPending} onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {items.length < 30 && (
                <div>
                  <label htmlFor={`new-suggestion-${categoryId}`} className="text-sm font-medium">Neuer Vorschlag</label>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      id={`new-suggestion-${categoryId}`}
                      placeholder="Artikelname"
                      value={newName}
                      maxLength={80}
                      disabled={isPending}
                      className="h-11"
                      onChange={(event) => setNewName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addSuggestion();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Vorschlag hinzufügen" disabled={isPending || !newName.trim()} onClick={addSuggestion}>
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 space-y-3 border-t p-4">
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-11 flex-1" disabled={isPending} onClick={onClose}>Abbrechen</Button>
                <Button type="submit" className="h-11 flex-1" disabled={isPending}>{isPending ? "Speichert …" : "Speichern"}</Button>
              </div>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
