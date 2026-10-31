"use client";

import { useId, useState, useTransition } from "react";
import { Check } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { setPaymentSettled } from "./actions";

export function PaymentSettledMark() {
  return (
    <span className="inline-flex shrink-0 text-green-700 dark:text-green-400">
      <Check aria-hidden="true" className="size-4" />
      <span className="sr-only">Zahlung beglichen</span>
    </span>
  );
}

export function PaymentStatus({
  kind,
  id,
  isSettled,
}: {
  kind: "fuel" | "expense";
  id: string;
  isSettled: boolean;
}) {
  const descriptionId = useId();
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="border-t pt-3" aria-busy={isSaving}>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <Checkbox
          checked={isSettled}
          disabled={isSaving}
          aria-describedby={descriptionId}
          className="size-5 border-muted-foreground data-disabled:cursor-wait data-disabled:opacity-50 data-checked:border-green-700 data-checked:bg-green-700 data-checked:text-white dark:data-checked:border-green-400 dark:data-checked:bg-green-400 dark:data-checked:text-black"
          onCheckedChange={(checked) => {
            setError(null);
            startSaving(async () => {
              try {
                const result = await setPaymentSettled(kind, id, !!checked);
                setError(result.error);
              } catch {
                setError(
                  "Zahlungsstatus konnte nicht gespeichert werden. Bitte erneut versuchen.",
                );
              }
            });
          }}
        />
        <span>Zahlung beglichen</span>
      </label>
      <p id={descriptionId} className="text-sm text-muted-foreground">
        {isSaving
          ? "Wird gespeichert …"
          : "Markieren, sobald alle Anteile ausgeglichen sind."}
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
