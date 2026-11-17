export const people = { miriam: "Miriam", simon: "Simon" } as const;
export type Person = keyof typeof people;

export function isPerson(value: string): value is Person {
  return value === "miriam" || value === "simon";
}
