"use client";

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
import { euro, formatFillUpDate } from "./format";
import type { FuelFillUpEntry } from "./types";

type DeleteFillUpDialogProps = {
  entry: FuelFillUpEntry | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirms deleting a fill-up.
 *
 * A fill-up is settled money and there is no undo, so the dialog repeats the
 * date and the amounts: on a phone the delete buttons sit close together, and
 * this is what catches a mis-tap before the row is gone.
 */
export function DeleteFillUpDialog({
  entry,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteFillUpDialogProps) {
  return (
    <AlertDialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open && !isDeleting) {
          onCancel();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tankfüllung löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {entry ? (
              <>
                {formatFillUpDate(entry.filledOn)} ·{" "}
                {euro.format(entry.paidAmount)}
                <br />
                Miriam {euro.format(entry.miriamAmount)} · Simon{" "}
                {euro.format(entry.simonAmount)}
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          {/* Marked busy rather than `disabled`: the shared Button fades a
              disabled control to 50% opacity, which drops this label to about
              2.6:1 against the dialog — under AA, on the one line saying a
              deletion is running. The click is guarded here instead. */}
          <AlertDialogAction
            aria-busy={isDeleting}
            aria-disabled={isDeleting}
            onClick={() => {
              if (!isDeleting) {
                onConfirm();
              }
            }}
            variant="destructive"
          >
            {isDeleting ? "Wird gelöscht …" : "Löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
