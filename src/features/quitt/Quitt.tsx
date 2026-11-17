"use client";

import { useRef, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Plus, X } from "lucide-react";
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
        <p className="text-sm text-muted-foreground">
          {balance === 0
            ? "Ihr seid quitt."
            : `${people[debtor]} schuldet ${people[creditor]}`}
        </p>
        <p className="text-3xl font-semibold tabular-nums">
          {euro.format(Math.abs(balance) / 100)}
        </p>
        <Button
          size="lg"
          variant="outline"
          onClick={() =>
            setDraft({
              kind: "payment",
              paidBy: debtor,
              amountCents: balance === 0 ? undefined : Math.abs(balance),
            })
          }
        >
          Rückzahlung erfassen
        </Button>
      </section>
      <Button size="lg" onClick={() => setDraft({ kind: "expense" })}>
        <Plus aria-hidden="true" />
        Ausgabe eintragen
      </Button>
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
          <ul className="divide-y border-y">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-label={`${entry.description} bearbeiten`}
                  onClick={() => setDraft(entry)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 rounded-sm py-4 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                >
                  <span className="break-words font-medium">
                    {entry.description}
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {euro.format(entry.amountCents / 100)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {entry.kind === "payment"
                      ? `Rückzahlung · ${people[entry.paidBy]} an ${people[entry.paidBy === "miriam" ? "simon" : "miriam"]}`
                      : `${people[entry.paidBy]} · für ${entry.forWhom === "both" ? "beide" : people[entry.forWhom]}`}
                  </span>
                  <span className="text-right text-sm text-muted-foreground tabular-nums">
                    {formatDate(entry.occurredOn)}
                  </span>
                </button>
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
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
            ref={popupRef}
            initialFocus={draft.id ? popupRef : inputRef}
            className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <Dialog.Title className="text-lg font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Schließen"
                disabled={pending}
                render={<Button type="button" variant="ghost" size="icon-lg" />}
              >
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <form
              aria-label={title}
              aria-busy={pending}
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!confirmDelete) submit(new FormData(event.currentTarget));
              }}
            >
              <input type="hidden" name="kind" value={draft.kind} />
              <input type="hidden" name="id" value={draft.id ?? ""} />
              <input type="hidden" name="version" value={draft.version ?? ""} />
              <fieldset disabled={pending} className="min-w-0 space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Beschreibung</span>
                  <Input
                    ref={inputRef}
                    name="description"
                    required
                    maxLength={200}
                    defaultValue={
                      draft.description ?? (payment ? "Ausgleich" : "")
                    }
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
                          : (draft.amountCents / 100)
                              .toFixed(2)
                              .replace(".", ",")
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
                    <legend className="mb-2 text-sm font-medium">
                      Für wen?
                    </legend>
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
                      Für beide wird halbiert. Bei ungeraden Centbeträgen trägt
                      die zahlende Person den zusätzlichen Cent.
                    </p>
                  </fieldset>
                )}
                {payment && (
                  <p className="text-sm text-muted-foreground">
                    Die Rückzahlung geht an die jeweils andere Person. Sie wird
                    erst mit „Speichern“ erfasst.
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
                      Diesen Eintrag wirklich löschen? Die Balance wird neu
                      berechnet.
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
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={onClose}
                    >
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
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// iOS keyboards shrink the visual viewport without resizing fixed-position layouts.
function fitVisualViewport(node: HTMLDivElement | null) {
  const viewport = window.visualViewport;
  if (!node || !viewport) return;
  const update = () => {
    node.style.top = `${viewport.offsetTop}px`;
    node.style.height = `${viewport.height}px`;
  };
  update();
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  return () => {
    viewport.removeEventListener("resize", update);
    viewport.removeEventListener("scroll", update);
  };
}
