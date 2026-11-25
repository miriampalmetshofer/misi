"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { setGroceryStore } from "./actions";
import { GROCERY_STORES, type GroceryStore } from "./stores";
import { StoreLogo } from "./StoreLogo";

export function GroceryStorePicker({ name, stores }: { name: string; stores: GroceryStore[] }) {
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [selectedStores, setSelectedStores] = useOptimistic(stores);
  const [error, setError] = useState(false);

  function toggleStore(store: GroceryStore, checked: boolean) {
    const nextStores = GROCERY_STORES.map(({ id }) => id).filter(
      (id) => id === store ? checked : selectedStores.includes(id),
    );
    const formData = new FormData();
    formData.set("name", name);
    formData.set("store", store);
    formData.set("checked", String(checked));

    setError(false);
    startSaving(async () => {
      setSelectedStores(nextStores);
      try {
        await setGroceryStore(formData);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (saving) return;
      setError(false);
      setOpen(nextOpen);
    }}>
      <PopoverTrigger
        render={<Button variant="ghost" />}
        className="h-10 gap-1 px-1.5 text-muted-foreground"
        aria-label={`Geschäfte für ${name} bearbeiten${selectedStores.length ? `: ${selectedStores.join(", ").toUpperCase()}` : ""}`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {selectedStores.length ? selectedStores.map((store) => <StoreLogo key={store} store={store} />) : (
          <Store aria-hidden="true" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" onPointerDown={(event) => event.stopPropagation()}>
        <PopoverTitle className="break-words">Geschäfte für {name}</PopoverTitle>
        <fieldset disabled={saving} className="space-y-2">
          {GROCERY_STORES.map(({ id, name: storeName }) => (
            <label key={id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-3">
              <input
                type="checkbox"
                checked={selectedStores.includes(id)}
                onChange={(event) => toggleStore(id, event.currentTarget.checked)}
                className="size-4 accent-primary"
              />
              <span aria-hidden="true"><StoreLogo store={id} /></span>
              {storeName}
            </label>
          ))}
        </fieldset>
        {saving && <p role="status">Wird gespeichert …</p>}
        {error && <p role="alert">Die Geschäfte konnten nicht gespeichert werden.</p>}
      </PopoverContent>
    </Popover>
  );
}
