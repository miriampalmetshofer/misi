import Link from "next/link";
import { people, type Person } from "@/lib/people";

export function AutoPaymentInfo({ paidBy }: { paidBy: Person | null }) {
  return (
    <p className="border-t pt-3 text-sm text-muted-foreground">
      {paidBy === null ? "Altbestand · bereits ausgeglichen" : (
        <>Bezahlt von {people[paidBy]} · Ausgleich über <Link href="/quitt" className="underline underline-offset-4">Quitt</Link></>
      )}
    </p>
  );
}
