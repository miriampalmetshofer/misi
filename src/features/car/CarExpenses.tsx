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
import { euro } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { deleteCarExpense } from "./actions";
import { ExpenseForm } from "./ExpenseForm";
import type { CarExpenseEntry } from "./expense";
import { ExpenseRow } from "./ExpenseRow";

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
              <ExpenseRow
                key={entry.id}
                entry={entry}
                isEditing={editing !== undefined}
                onEdit={() => setEditing(entry)}
              />
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
                ? `${deleting.description} · ${formatDate(deleting.spentOn)} · ${euro.format(deleting.totalAmount)}`
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
