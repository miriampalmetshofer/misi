import { useId } from "react";
import { people, type Person } from "@/lib/people";

export function PaidByField({ value, onChange }: {
  value: Person;
  onChange: (person: Person) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <label htmlFor={id}>Bezahlt von</label>
      <select
        id={id}
        name="paidBy"
        value={value}
        onChange={(event) => onChange(event.target.value as Person)}
        className="h-10 rounded-md border bg-background px-3 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
      >
        {Object.entries(people).map(([person, label]) => (
          <option key={person} value={person}>{label}</option>
        ))}
      </select>
    </div>
  );
}
