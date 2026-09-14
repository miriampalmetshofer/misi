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
import type { OptimisticFuelFillUpEntry } from "./types";

type DeleteFillUpDialogProps = {
  /** The fill-up awaiting confirmation, or null while the dialog is closed. */
  entry: OptimisticFuelFillUpEntry | null;
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
  onCancel,
  onConfirm,
}: DeleteFillUpDialogProps) {
  return (
    <AlertDialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) {
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
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
