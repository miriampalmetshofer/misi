"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { euro } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { balanceCents, people, type QuittEntry } from "./types";
import { deleteQuittEntry, saveQuittEntry } from "./actions";

type Draft = Partial<QuittEntry> & { kind: QuittEntry["kind"] };

export function Quitt({
  entries,
  today,
}: {
  entries: QuittEntry[];
  today: string;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const balance = balanceCents(entries);
  const debtor = balance > 0 ? "simon" : "miriam";
  const creditor = balance > 0 ? "miriam" : "simon";

  return (
    <div className="space-y-6">
      <section
        aria-label="Balance"
        className="space-y-3 rounded-2xl border bg-card p-5"
      >
        <h2 className="text-lg font-semibold">Balance</h2>
        <p className="text-2xl font-semibold tabular-nums">
          {euro.format(Math.abs(balance) / 100)}
        </p>
        <p>
          {balance === 0
            ? "Ihr seid quitt."
            : `${people[debtor]} schuldet ${people[creditor]} diesen Betrag.`}
        </p>
        {balance !== 0 && (
          <Button
            size="lg"
            variant="outline"
            disabled={draft !== null}
            onClick={() =>
              setDraft({
                kind: "payment",
                paidBy: debtor,
                amountCents: Math.abs(balance),
              })
            }
          >
            Alles ausgleichen
          </Button>
        )}
      </section>
      {!draft && (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => setDraft({ kind: "expense" })}>
            Ausgabe eintragen
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setDraft({ kind: "payment", paidBy: debtor })}
          >
            Rückzahlung eintragen
          </Button>
        </div>
      )}
      {draft && (
        <EntryForm
          key={draft.id ?? draft.kind}
          draft={draft}
          today={today}
          onClose={() => setDraft(null)}
        />
      )}
      <section aria-label="Verlauf" className="space-y-3">
        <h2 className="text-lg font-semibold">Verlauf</h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground">
            Noch keine Einträge. Tragt eure erste gemeinsame Ausgabe ein.
          </p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="break-words font-medium">{entry.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(entry.occurredOn)} ·{" "}
                    {entry.kind === "payment" ? "Rückzahlung" : "Ausgabe"}
                  </p>
                  <p className="text-sm">
                    {entry.kind === "payment"
                      ? `${people[entry.paidBy]} an ${people[entry.paidBy === "miriam" ? "simon" : "miriam"]}`
                      : `${people[entry.paidBy]} bezahlt · Für ${entry.forWhom === "both" ? "beide" : people[entry.forWhom]}`}
                  </p>
                  <Button
                    variant="ghost"
                    aria-label={`${entry.description} bearbeiten`}
                    disabled={draft !== null}
                    onClick={() => setDraft(entry)}
                  >
                    Bearbeiten
                  </Button>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">
                  {euro.format(entry.amountCents / 100)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EntryForm({
  draft,
  today,
  onClose,
}: {
  draft: Draft;
  today: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const payment = draft.kind === "payment";
  const title = draft.id
    ? "Eintrag bearbeiten"
    : payment
      ? "Rückzahlung eintragen"
      : "Ausgabe eintragen";

  function submit(form: FormData, remove = false) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result =
          remove && draft.id && draft.version
            ? await deleteQuittEntry(draft.id, draft.version)
            : await saveQuittEntry(form);
        if (result.error) setError(result.error);
        else onClose();
      } catch {
        setError(
          "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.",
        );
      }
    });
  }

  return (
    <form
      aria-label={title}
      aria-busy={pending}
      className="space-y-4 rounded-2xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
    >
      <h2
        tabIndex={-1}
        ref={focusFormTitle}
        className="text-lg font-semibold outline-none"
      >
        {title}
      </h2>
      <input type="hidden" name="kind" value={draft.kind} />
      <input type="hidden" name="id" value={draft.id ?? ""} />
      <input type="hidden" name="version" value={draft.version ?? ""} />
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Beschreibung</span>
          <Input
            name="description"
            required
            maxLength={200}
            defaultValue={draft.description ?? (payment ? "Ausgleich" : "")}
            placeholder="z. B. Wocheneinkauf"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Betrag (€)</span>
            <Input
              name="amount"
              required
              inputMode="decimal"
              pattern="[0-9]{1,7}([,.][0-9]{1,2})?"
              defaultValue={
                draft.amountCents === undefined
                  ? ""
                  : (draft.amountCents / 100).toFixed(2).replace(".", ",")
              }
              placeholder="0,00"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              {payment ? "Datum der Rückzahlung" : "Datum des Einkaufs"}
            </span>
            <Input
              type="date"
              name="occurredOn"
              required
              defaultValue={draft.occurredOn ?? today}
            />
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-2 text-sm font-medium">
            {payment ? "Zurückgezahlt von" : "Bezahlt von"}
          </legend>
          {Object.entries(people).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-10 items-center gap-2 rounded-lg border px-3"
            >
              <input
                type="radio"
                name="paidBy"
                value={value}
                defaultChecked={value === (draft.paidBy ?? "miriam")}
                required
              />
              {label}
            </label>
          ))}
        </fieldset>
        {!payment && (
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-2 text-sm font-medium">Für wen?</legend>
            {Object.entries({ both: "Beide", ...people }).map(
              ([value, label]) => (
                <label
                  key={value}
                  className="flex min-h-10 items-center gap-2 rounded-lg border px-3"
                >
                  <input
                    type="radio"
                    name="forWhom"
                    value={value}
                    defaultChecked={value === (draft.forWhom ?? "both")}
                    required
                  />
                  {label}
                </label>
              ),
            )}
            <p className="w-full text-sm text-muted-foreground">
              Für beide wird halbiert. Bei ungeraden Centbeträgen trägt die
              zahlende Person den zusätzlichen Cent.
            </p>
          </fieldset>
        )}
        {payment && (
          <p className="text-sm text-muted-foreground">
            Die Rückzahlung geht an die jeweils andere Person. Sie wird erst mit
            „Speichern“ erfasst.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {confirmDelete ? (
          <div className="space-y-2">
            <p>
              Diesen Eintrag wirklich löschen? Die Balance wird neu berechnet.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={() => submit(new FormData(), true)}
              >
                Endgültig löschen
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setConfirmDelete(false)}
              >
                Zurück
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg">
              {pending ? "Wird gespeichert …" : "Speichern"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={onClose}>
              Abbrechen
            </Button>
            {draft.id && (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => setConfirmDelete(true)}
              >
                Löschen
              </Button>
            )}
          </div>
        )}
      </fieldset>
    </form>
  );
}

function focusFormTitle(node: HTMLHeadingElement | null) {
  if (!node) return;
  node.focus({ preventScroll: true });
  node.scrollIntoView({ block: "start" });
}
