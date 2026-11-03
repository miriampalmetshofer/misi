"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveGrocerySuggestions } from "./actions";

export function GrocerySuggestionsEditor({
  categoryId,
  suggestions,
  onClose,
}: {
  categoryId: string;
  suggestions: string[];
  onClose: () => void;
}) {
  const [original] = useState(suggestions);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        data.set("categoryId", categoryId);
        data.set("original", JSON.stringify(original));
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
      <label htmlFor={`suggestions-${categoryId}`} className="text-sm">
        Ein Vorschlag pro Zeile
      </label>
      <textarea
        id={`suggestions-${categoryId}`}
        name="suggestions"
        defaultValue={original.join("\n")}
        rows={4}
        maxLength={3000}
        disabled={isPending}
        aria-describedby={`suggestions-help-${categoryId}`}
        className="block w-full min-w-0 resize-y rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
      <p id={`suggestions-help-${categoryId}`} className="text-xs text-muted-foreground">
        Zum Entfernen die Zeile löschen. Maximal 30 Vorschläge, je 80 Zeichen.
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-10" disabled={isPending}>
          {isPending ? "Speichert …" : "Speichern"}
        </Button>
        <Button type="button" variant="ghost" className="h-10" disabled={isPending} onClick={onClose}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
