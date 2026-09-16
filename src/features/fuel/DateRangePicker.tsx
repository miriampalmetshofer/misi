"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { de } from "date-fns/locale";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fromDateValue, toDateValue } from "./dateRange";
import { formatFillUpDate } from "./format";
import type { DateRange } from "./summarize";

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

/**
 * Field that opens a calendar to pick a start and an end date.
 *
 * Reports a range only once both ends are set, and converts between the
 * yyyy-mm-dd strings the app stores and the Dates react-day-picker needs.
 */
export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  // The range on display: the committed one until someone starts changing it.
  const [draft, setDraft] = useState<DayPickerRange | undefined>(undefined);
  const selected = draft ?? toDayPickerRange(value);

  function handleSelect(next: DayPickerRange | undefined) {
    // Clicking a complete range means starting a new one. day-picker would
    // instead drag its start and keep the old end, leaving the end unreachable.
    if (selected?.from && selected.to) {
      setDraft({ from: pickedDay(next, selected), to: undefined });
      return;
    }

    setDraft(next);

    // Half a range is not a period yet, so nothing is reported until both
    // ends are in.
    if (!next?.from || !next.to) {
      return;
    }

    onChange({ from: toDateValue(next.from), to: toDateValue(next.to) });
    setDraft(undefined);
    setIsOpen(false);
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    // Drop a half-made range on close.
    if (!open) {
      setDraft(undefined);
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            className="w-full justify-between font-normal tabular-nums"
            variant="outline"
          >
            <span>
              {formatFillUpDate(value.from)} – {formatFillUpDate(value.to)}
            </span>
            <CalendarIcon
              aria-hidden="true"
              className="text-muted-foreground"
            />
          </Button>
        }
      />

      <PopoverContent className="w-auto p-0">
        <Calendar
          autoFocus
          // Open where the range is, not on today.
          defaultMonth={fromDateValue(value.from)}
          locale={de}
          mode="range"
          onSelect={handleSelect}
          selected={selected}
        />
      </PopoverContent>
    </Popover>
  );
}

/** The committed range in the shape day-picker selects with. */
function toDayPickerRange(value: DateRange): DayPickerRange | undefined {
  const from = fromDateValue(value.from);
  return from ? { from, to: fromDateValue(value.to) } : undefined;
}

/**
 * The day just clicked, out of the range day-picker built from it: whichever
 * end is not already in `previous`, or its sole end when the two collapsed.
 */
function pickedDay(
  next: DayPickerRange | undefined,
  previous: DayPickerRange,
): Date {
  const ends = [next?.from, next?.to].filter((date) => date !== undefined);
  const moved = ends.find(
    (date) =>
      date.getTime() !== previous.from?.getTime() &&
      date.getTime() !== previous.to?.getTime(),
  );

  return moved ?? ends[0] ?? previous.from!;
}
