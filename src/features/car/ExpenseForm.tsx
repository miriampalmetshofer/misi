"use client";

import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { euro } from "@/features/fuel/format";
import { today } from "@/features/fuel/useFuelSplitForm";
import { saveCarExpense } from "./actions";
import {
  isExpenseDate,
  parseDecimal,
  splitExpense,
  toField,
  type CarExpenseEntry,
} from "./expense";

export function ExpenseForm({
  entry,
  onClose,
  onDelete,
}: {
  entry: CarExpenseEntry | null;
  onClose: () => void;
  onDelete: (entry: CarExpenseEntry) => void;
}) {
  const formId = useId();
  const [spentOn, setSpentOn] = useState(entry?.spentOn ?? today);
  const [description, setDescription] = useState(entry?.description ?? "");
  const [amount, setAmount] = useState(entry ? toField(entry.totalAmount) : "");
  const [shares, setShares] = useState({
    miriam: toField(entry?.miriamPercent ?? 50),
    simon: toField(
      Math.round((100 - (entry?.miriamPercent ?? 50)) * 100) / 100,
    ),
  });
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const total = parseDecimal(amount, 100_000);
  const miriam = parseDecimal(shares.miriam, 100);
  const simon = parseDecimal(shares.simon, 100);
  const validShares =
    miriam !== null &&
    simon !== null &&
    Math.abs(miriam + simon - 100) < 0.00001;
  const split =
    total !== null && total > 0 && miriam !== null && validShares
      ? splitExpense(total, miriam)
      : null;
  const canSave =
    split !== null && description.trim() !== "" && isExpenseDate(spentOn);

  function changeShare(person: "miriam" | "simon", raw: string) {
    const value = raw.replace(".", ",");
    const parsed = parseDecimal(value, 100);
    const other = person === "miriam" ? "simon" : "miriam";
    setShares((current) => ({
      ...current,
      [person]: value,
      ...(parsed === null
        ? {}
        : { [other]: toField(Math.round((100 - parsed) * 100) / 100) }),
    }));
  }

  return (
    <form
      aria-label={entry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
      className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave || isSaving) return;
        const form = new FormData();
        if (entry) form.set("id", entry.id);
        for (const [key, value] of Object.entries({
          spentOn,
          description,
          totalAmount: amount,
          miriamPercent: shares.miriam,
          note,
        })) {
          form.set(key, value);
        }
        setError(null);
        startSaving(async () => {
          try {
            const result = await saveCarExpense(form);
            if (result.error) setError(result.error);
            else onClose();
          } catch {
            setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
          }
        });
      }}
    >
      <h3 className="font-semibold">
        {entry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
      </h3>
      <fieldset disabled={isSaving} className="flex min-w-0 flex-col gap-5">
        <label className="flex items-center justify-between gap-3">
          <span>Datum</span>
          <Input
            aria-label="Datum"
            className="w-40"
            type="date"
            required
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>Was wurde gemacht oder gekauft?</span>
          <Input
            required
            maxLength={200}
            placeholder="z. B. Winterreifen gekauft"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>Gesamtkosten</span>
          <span className="flex items-center gap-2">
            <Input
              aria-label="Gesamtkosten"
              className="w-28 text-right tabular-nums"
              inputMode="decimal"
              placeholder="0,00"
              required
              value={amount}
              aria-invalid={amount !== "" && (total === null || total <= 0)}
              onChange={(e) => setAmount(e.target.value.replace(".", ","))}
            />
            <span className="text-sm text-muted-foreground">€</span>
          </span>
        </label>
        <div className="flex flex-col gap-3">
          {(["miriam", "simon"] as const).map((person) => (
            <div
              key={person}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
            >
              <label htmlFor={`${formId}-${person}`}>
                Anteil {person === "miriam" ? "Miriam" : "Simon"}
              </label>
              <span className="flex items-center gap-1.5">
                <Input
                  id={`${formId}-${person}`}
                  className="w-20 text-right tabular-nums"
                  inputMode="decimal"
                  required
                  value={shares[person]}
                  aria-invalid={!validShares}
                  onChange={(e) => changeShare(person, e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </span>
              <output
                className="min-w-20 text-right text-sm text-muted-foreground tabular-nums"
                aria-label={`Eurobetrag ${person === "miriam" ? "Miriam" : "Simon"}`}
              >
                {split
                  ? euro.format(
                      person === "miriam"
                        ? split.miriamAmount
                        : split.simonAmount,
                    )
                  : "—"}
              </output>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            Der andere Anteil ergänzt sich automatisch auf 100 %.
          </p>
          {amount !== "" && (total === null || total <= 0) ? (
            <p className="text-sm text-destructive">
              Bitte einen Betrag über 0 bis 100.000 € mit höchstens zwei
              Nachkommastellen eintragen.
            </p>
          ) : null}
          {!validShares ? (
            <p className="text-sm text-destructive">
              Bitte Anteile zwischen 0 und 100 % mit höchstens zwei
              Nachkommastellen eintragen.
            </p>
          ) : null}
        </div>
        <label className="flex flex-col gap-2">
          <span>
            Notiz{" "}
            <span className="text-sm text-muted-foreground">(optional)</span>
          </span>
          <Input
            maxLength={2000}
            placeholder="z. B. Werkstatt oder weitere Details"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canSave || isSaving}>
          {isSaving ? "Wird gespeichert …" : "Speichern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onClose}
        >
          Abbrechen
        </Button>
        {entry ? (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-destructive"
            disabled={isSaving}
            onClick={() => onDelete(entry)}
          >
            Löschen
          </Button>
        ) : null}
      </div>
    </form>
  );
}
