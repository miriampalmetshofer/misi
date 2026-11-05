"use client";

import Link from "next/link";
import { useState } from "react";
import { format, getISOWeek, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Moon, Plus, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MealForm } from "./MealForm";
import {
  mealLabels,
  personLabels,
  shiftDate,
  weekStart,
  type MealEntry,
  type MealTime,
} from "./types";

type Editing = { plannedOn: string; mealTime: MealTime; entry?: MealEntry };

export function MealPlanner({
  start,
  today,
  entries,
}: {
  start: string;
  today: string;
  entries: MealEntry[];
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const end = shiftDate(start, 6);
  const dateLabel = (date: string, pattern: string) =>
    format(parseISO(date), pattern, { locale: de });
  const weekHref = (offset: number) =>
    `/speiseplan?woche=${shiftDate(start, offset)}`;

  return (
    <section
      className="mt-6 flex flex-col gap-5 sm:mt-8"
      aria-label="Wochenplan"
    >
      <nav
        aria-label="Wochenauswahl"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h2 className="font-semibold tabular-nums">
            {dateLabel(start, "d. MMM")} – {dateLabel(end, "d. MMM yyyy")}
          </h2>
          <p className="text-sm text-muted-foreground">
            Kalenderwoche {getISOWeek(parseISO(start))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            render={<Link href={weekHref(-7)} />}
            variant="outline"
            size="icon-lg"
            aria-label="Vorherige Woche"
          >
            <ChevronLeft />
          </Button>
          <Button
            render={<Link href={`/speiseplan?woche=${weekStart(today)}`} />}
            variant="outline"
            size="lg"
          >
            Diese Woche
          </Button>
          <Button
            render={<Link href={weekHref(7)} />}
            variant="outline"
            size="icon-lg"
            aria-label="Nächste Woche"
          >
            <ChevronRight />
          </Button>
        </div>
      </nav>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 7 }, (_, index) => {
          const day = shiftDate(start, index);
          const isToday = day === today;
          return (
            <section
              key={day}
              aria-label={dateLabel(day, "EEEE, d. MMMM")}
              className={cn(
                "min-w-0 overflow-hidden rounded-2xl border bg-card",
                isToday && "border-foreground/40",
              )}
            >
              <header className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                <h3 className="font-semibold">
                  {dateLabel(day, "EEEE")}{" "}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {dateLabel(day, "d. MMM")}
                  </span>
                </h3>
                {isToday ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Heute
                  </span>
                ) : null}
              </header>
              <div className="divide-y px-4">
                {(["lunch", "dinner"] as const).map((mealTime) => {
                  const Icon = mealTime === "lunch" ? Sun : Moon;
                  const meals = entries.filter(
                    (entry) =>
                      entry.plannedOn === day && entry.mealTime === mealTime,
                  );
                  return (
                    <section
                      key={mealTime}
                      aria-label={mealLabels[mealTime]}
                      className="flex flex-col gap-2 py-3"
                    >
                      <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Icon className="size-3.5" aria-hidden="true" />
                        {mealLabels[mealTime]}
                      </h4>
                      {meals.length ? (
                        <ul className="flex flex-col gap-1">
                          {meals.map((entry) => (
                            <li key={entry.id}>
                              <button
                                type="button"
                                aria-label={`${entry.name} bearbeiten`}
                                aria-haspopup="dialog"
                                aria-describedby={`meal-person-${entry.id}`}
                                disabled={editing !== null}
                                onClick={() =>
                                  setEditing({
                                    plannedOn: day,
                                    mealTime,
                                    entry,
                                  })
                                }
                                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default"
                              >
                                <span className="min-w-0 break-words text-sm">
                                  {entry.name}
                                </span>
                                <span
                                  id={`meal-person-${entry.id}`}
                                  className={cn(
                                    "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
                                    entry.person === "both"
                                      ? "bg-muted text-muted-foreground"
                                      : entry.person === "miriam"
                                        ? "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200"
                                        : "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
                                  )}
                                >
                                  {personLabels[entry.person]}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <Button
                        variant="ghost"
                        aria-haspopup="dialog"
                        className="min-h-10 justify-start text-muted-foreground"
                        disabled={editing !== null}
                        onClick={() => setEditing({ plannedOn: day, mealTime })}
                      >
                        <Plus aria-hidden="true" />
                        {meals.length
                          ? "Eintrag hinzufügen"
                          : mealTime === "lunch"
                            ? "Mittagessen eintragen"
                            : "Abendessen eintragen"}
                      </Button>
                    </section>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {editing ? (
        <MealForm
          entry={editing.entry}
          plannedOn={editing.plannedOn}
          mealTime={editing.mealTime}
          context={`${dateLabel(editing.plannedOn, "EEEE")} ${mealLabels[editing.mealTime]}`}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}
