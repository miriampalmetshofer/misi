import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { MealNavigation } from "@/features/meals/MealNavigation";

export default function CookingLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
      <Link href="/" className="page-back-link">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Home
      </Link>
      <h1 className="page-headline">Kochen</h1>
      <MealNavigation />
      {children}
    </main>
  );
}
