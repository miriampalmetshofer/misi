"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { euro, formatFillUpDate } from "@/features/fuel/format";
import { deleteCarExpense } from "./actions";
import { ExpenseForm } from "./ExpenseForm";
import { toField, type CarExpenseEntry } from "./expense";

export function CarExpenses({ entries }: { entries: CarExpenseEntry[] }) {
  const [editing, setEditing] = useState<CarExpenseEntry | null | undefined>();
  const [deleting, setDeleting] = useState<CarExpenseEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  return (
    <section
      className="mt-8 flex flex-col gap-6"
      aria-labelledby="car-expenses"
    >
      <h2 id="car-expenses" className="text-lg font-semibold">
        Reparaturen & Einkäufe
      </h2>
      {editing === undefined ? (
        <Button className="self-start" onClick={() => setEditing(null)}>
          <Plus aria-hidden="true" />
          Eintrag hinzufügen
        </Button>
      ) : (
        <ExpenseForm
          key={editing?.id ?? "new"}
          entry={editing}
          onClose={() => setEditing(undefined)}
          onDelete={(entry) => {
            setError(null);
            setDeleting(entry);
          }}
        />
      )}

      <div className="flex flex-col gap-3">
        <h3 className="section-label">Bisherige Einträge</h3>
        {!entries.length ? (
          <p className="text-body-muted">
            Noch keine Reparaturen oder Einkäufe eingetragen.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:p-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {formatFillUpDate(entry.spentOn)}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {euro.format(entry.totalAmount)}
                  </span>
                </div>
                <p className="font-medium break-words">{entry.description}</p>
                <dl className="grid gap-1 text-sm text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Miriam · {toField(entry.miriamPercent)} %</dt>
                    <dd className="tabular-nums">
                      {euro.format(entry.miriamAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>
                      Simon ·{" "}
                      {toField(
                        Math.round((100 - entry.miriamPercent) * 100) / 100,
                      )}{" "}
                      %
                    </dt>
                    <dd className="tabular-nums">
                      {euro.format(entry.simonAmount)}
                    </dd>
                  </div>
                </dl>
                {entry.note ? (
                  <p className="text-sm text-muted-foreground break-words">
                    {entry.note}
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  className="self-start"
                  disabled={editing !== undefined}
                  onClick={() => setEditing(entry)}
                  aria-label={`${entry.description} bearbeiten`}
                >
                  Bearbeiten
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `${deleting.description} · ${formatFillUpDate(deleting.spentOn)} · ${euro.format(deleting.totalAmount)}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              aria-busy={isDeleting}
              aria-disabled={isDeleting}
              onClick={() => {
                if (!deleting || isDeleting) return;
                setError(null);
                startDeleting(async () => {
                  try {
                    const result = await deleteCarExpense(deleting.id);
                    if (result.error) setError(result.error);
                    else {
                      setDeleting(null);
                      setEditing(undefined);
                    }
                  } catch {
                    setError("Löschen fehlgeschlagen. Bitte erneut versuchen.");
                  }
                });
              }}
            >
              {isDeleting ? "Wird gelöscht …" : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
