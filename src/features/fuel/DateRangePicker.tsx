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
 * Picks a period as one field rather than two date inputs.
 *
 * The range is held as yyyy-mm-dd strings everywhere else, because that
 * compares chronologically and sidesteps the timezone shift a parsed bare date
 * brings. react-day-picker wants Dates, so the conversion happens here at the
 * boundary and nowhere else.
 *
 * A range is only reported once both ends are picked: day-picker hands over a
 * half-open range after the first click, and summarising that would redraw the
 * numbers for a period nobody asked for yet.
 */
export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  // The range on display: the committed one until someone starts changing it,
  // so opening the calendar shows the period the field names rather than a
  // blank month.
  const [draft, setDraft] = useState<DayPickerRange | undefined>(undefined);
  const selected = draft ?? toDayPickerRange(value);

  function handleSelect(next: DayPickerRange | undefined) {
    // Clicking while a whole range is on display means starting a new one.
    // day-picker instead drags the existing start and keeps the old end, which
    // would leave the end date unreachable, so the click is taken as a fresh
    // start and the range reopened for its second half.
    if (selected?.from && selected.to) {
      setDraft({ from: pickedDay(next, selected), to: undefined });
      return;
    }

    setDraft(next);

    // Half a range is not a period yet: until both ends are in, the summary
    // behind the popover keeps showing what it was already showing.
    if (!next?.from || !next.to) {
      return;
    }

    onChange({ from: toDateValue(next.from), to: toDateValue(next.to) });
    setDraft(undefined);
    setIsOpen(false);
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    // Drop a half-made range on close, so the field goes back to showing the
    // period that is actually in effect.
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
          // Opens where the range is rather than on today, so a period picked
          // last year does not start the user a dozen swipes away from it.
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
 * The day just clicked, out of the range day-picker built from it.
 *
 * Dragging an existing range leaves one end untouched, so the new day is
 * whichever end is not already in `previous` — and when a click lands on an end
 * of the current range, day-picker collapses it to that single day.
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
