"use client";

import Link from "next/link";
import { useState } from "react";
import { format, getISOWeek, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Moon,
  Plus,
  Sun,
} from "lucide-react";

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
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const currentWeek = start === weekStart(today);
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
      <nav aria-label="Wochenauswahl" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Button
            role="link"
            nativeButton={false}
            render={<Link href={weekHref(-7)} />}
            variant="outline"
            size="icon-lg"
            aria-label="Vorherige Woche"
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-0 text-center">
            <h2 className="text-sm font-semibold tabular-nums sm:text-base">
              {dateLabel(
                start,
                start.slice(0, 7) === end.slice(0, 7)
                  ? "d."
                  : start.slice(0, 4) === end.slice(0, 4)
                    ? "d. MMM"
                    : "d. MMM yyyy",
              )}
              –{dateLabel(end, "d. MMM yyyy")}
            </h2>
            <p className="text-sm text-muted-foreground">
              Kalenderwoche {getISOWeek(parseISO(start))}
            </p>
          </div>
          <Button
            role="link"
            nativeButton={false}
            render={<Link href={weekHref(7)} />}
            variant="outline"
            size="icon-lg"
            aria-label="Nächste Woche"
          >
            <ChevronRight />
          </Button>
        </div>
        {!currentWeek ? (
          <Link
            href={`/speiseplan?woche=${weekStart(today)}`}
            className="self-center rounded px-2 py-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            Zur aktuellen Woche
          </Link>
        ) : null}
      </nav>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 7 }, (_, index) => {
          const day = shiftDate(start, index);
          const isToday = day === today;
          const collapsible = currentWeek && day < today;
          const collapsed = collapsible && !expandedDays.includes(day);
          const title = (
            <>
              {dateLabel(day, "EEEE")}{" "}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {dateLabel(day, "d. MMM")}
              </span>
            </>
          );
          return (
            <section
              key={day}
              aria-label={dateLabel(day, "EEEE, d. MMMM")}
              className={cn(
                "min-w-0 overflow-hidden rounded-2xl border bg-card",
                isToday && "border-foreground/40",
              )}
            >
              <header
                className={cn(
                  "flex items-center justify-between gap-2 bg-muted/40",
                  !collapsed && "border-b",
                )}
              >
                <h3 className="flex-1 font-semibold">
                  {collapsible ? (
                    <button
                      type="button"
                      aria-expanded={!collapsed}
                      aria-controls={`meals-${day}`}
                      className="flex min-h-12 w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() =>
                        setExpandedDays((days) =>
                          collapsed
                            ? [...days, day]
                            : days.filter((value) => value !== day),
                        )
                      }
                    >
                      <span>{title}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          "size-4 text-muted-foreground",
                          !collapsed && "rotate-180",
                        )}
                      />
                    </button>
                  ) : (
                    <span className="block px-4 py-3">{title}</span>
                  )}
                </h3>
                {isToday ? (
                  <span className="mr-4 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Heute
                  </span>
                ) : null}
              </header>
              <div
                id={`meals-${day}`}
                hidden={collapsed}
                className="divide-y px-4"
              >
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
                      className="flex flex-col py-3"
                    >
                      <h4 className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                                className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default"
                              >
                                <span className="min-w-0 break-words text-lg font-medium">
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
                        className={cn(
                          "justify-start text-muted-foreground",
                          meals.length ? "h-8" : "min-h-10",
                        )}
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
