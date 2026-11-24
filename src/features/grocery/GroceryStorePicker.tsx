"use client";

import { useState, type FormEvent } from "react";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { saveGroceryStores } from "./actions";
import { GROCERY_STORES, type GroceryStore } from "./stores";
import { StoreLogo } from "./StoreLogo";

export function GroceryStorePicker({ name, stores }: { name: string; stores: GroceryStore[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setError(false);
    formData.set("name", name);
    try {
      await saveGroceryStores(formData);
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
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
        aria-label={`Geschäfte für ${name} bearbeiten${stores.length ? `: ${stores.join(", ").toUpperCase()}` : ""}`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {stores.length ? stores.map((store) => <StoreLogo key={store} store={store} />) : (
          <Store aria-hidden="true" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" onPointerDown={(event) => event.stopPropagation()}>
        <PopoverTitle className="break-words">Geschäfte für {name}</PopoverTitle>
        <form onSubmit={save}>
          <fieldset disabled={saving} className="space-y-2">
            {GROCERY_STORES.map(({ id, name: storeName }) => (
              <label key={id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-3">
                <input
                  type="checkbox"
                  name="stores"
                  value={id}
                  defaultChecked={stores.includes(id)}
                  className="size-4 accent-primary"
                />
                <span aria-hidden="true"><StoreLogo store={id} /></span>
                {storeName}
              </label>
            ))}
            {error && <p role="alert">Die Geschäfte konnten nicht gespeichert werden.</p>}
            <Button className="w-full" type="submit">{saving ? "Wird gespeichert …" : "Speichern"}</Button>
          </fieldset>
        </form>
      </PopoverContent>
    </Popover>
  );
}
