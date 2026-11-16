"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
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
import { DragProvider } from "@/features/grocery/drag/DragContext";
import { MealItem, MealSlot } from "./MealDrag";
import { saveMeal } from "./actions";
import { MealForm } from "./MealForm";
import {
  mealLabels,
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
  const [moving, startMove] = useTransition();
  const moveInFlight = useRef(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [visibleEntries, moveOptimistically] = useOptimistic(
    entries,
    (current, moved: MealEntry) =>
      current.map((entry) => (entry.id === moved.id ? moved : entry)),
  );
  function moveMeal(id: string, target: string) {
    const entry = entries.find((value) => value.id === id);
    const [plannedOn, mealTime] = target.split(":");
    if (
      !entry ||
      moveInFlight.current ||
      (mealTime !== "lunch" && mealTime !== "dinner")
    )
      return;
    moveInFlight.current = true;
    setMoveError(null);
    startMove(async () => {
      moveOptimistically({ ...entry, plannedOn, mealTime });
      const form = new FormData();
      Object.entries({ ...entry, plannedOn, mealTime }).forEach(
        ([key, value]) => form.set(key, String(value)),
      );
      try {
        const result = await saveMeal(form);
        if (result.error) setMoveError(result.error);
      } catch {
        setMoveError("Verschieben fehlgeschlagen. Bitte erneut versuchen.");
      } finally {
        moveInFlight.current = false;
      }
    });
  }
  const [editing, setEditing] = useState<Editing | null>(null);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const currentWeek = start === weekStart(today);
  const end = shiftDate(start, 6);
  const dateLabel = (date: string, pattern: string) =>
    format(parseISO(date), pattern, { locale: de });
  const weekHref = (offset: number) =>
    `/speiseplan?woche=${shiftDate(start, offset)}`;

  return (
    <DragProvider grid onMoveItem={moveMeal}>
      <section
        className="mt-6 flex flex-col gap-5 sm:mt-8"
        aria-label="Wochenplan"
      >
        {moveError ? (
          <p role="alert" className="text-sm text-destructive">
            {moveError}
          </p>
        ) : null}
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
                  "min-w-0 rounded-2xl border bg-card",
                  isToday && "border-foreground/40",
                )}
              >
                <header
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-t-2xl bg-muted/40",
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
                    const meals = visibleEntries.filter(
                      (entry) =>
                        entry.plannedOn === day && entry.mealTime === mealTime,
                    );
                    return (
                      <MealSlot
                        id={`${day}:${mealTime}`}
                        meals={meals}
                        key={mealTime}
                        aria-label={mealLabels[mealTime]}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Icon className="size-3.5" aria-hidden="true" />
                            {mealLabels[mealTime]}
                          </h4>
                          {meals.length ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Eintrag hinzufügen"
                              title="Eintrag hinzufügen"
                              aria-haspopup="dialog"
                              disabled={editing !== null || moving}
                              onClick={() =>
                                setEditing({ plannedOn: day, mealTime })
                              }
                              className="text-muted-foreground"
                            >
                              <Plus aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                        {meals.length ? (
                          <ul className="flex flex-col gap-1">
                            {meals.map((entry) => (
                              <MealItem
                                key={entry.id}
                                entry={entry}
                                disabled={editing !== null || moving}
                                onEdit={() =>
                                  setEditing({
                                    plannedOn: day,
                                    mealTime,
                                    entry,
                                  })
                                }
                              />
                            ))}
                          </ul>
                        ) : null}
                        {!meals.length ? (
                          <Button
                            variant="ghost"
                            aria-haspopup="dialog"
                            className="min-h-10 justify-start text-muted-foreground"
                            disabled={editing !== null || moving}
                            onClick={() =>
                              setEditing({ plannedOn: day, mealTime })
                            }
                          >
                            <Plus aria-hidden="true" />
                            {mealTime === "lunch"
                              ? "Mittagessen eintragen"
                              : "Abendessen eintragen"}
                          </Button>
                        ) : null}
                      </MealSlot>
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
    </DragProvider>
  );
}
