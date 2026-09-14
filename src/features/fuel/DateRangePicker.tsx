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
  // The range being drawn right now, which is deliberately NOT seeded from the
  // committed one. Handed a complete range, day-picker treats the next click as
  // dragging its start and keeps the old end — so the popover would close after
  // a single tap and the end date could never be changed. Starting empty makes
  // the first click a fresh start and the second the end, which is what the
  // field invites. The committed range still shows on the trigger and as the
  // calendar's initial month, so nothing is lost by not preselecting it.
  const [draft, setDraft] = useState<DayPickerRange | undefined>(undefined);

  function handleSelect(next: DayPickerRange | undefined) {
    setDraft(next);

    // A range is finished once its two ends are different days. day-picker
    // reports the opening click as `{from, to}` on the same day, and committing
    // that would close the popover after one tap on a one-day period. Until it
    // is finished the summary behind the popover keeps showing the period it
    // was already showing.
    if (!next?.from || !next.to || next.from.getTime() === next.to.getTime()) {
      return;
    }

    onChange({ from: toDateValue(next.from), to: toDateValue(next.to) });
    setDraft(undefined);
    setIsOpen(false);
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    // Abandoning a half-made range must not leave it on screen next time.
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
          selected={draft}
        />
      </PopoverContent>
    </Popover>
  );
}
