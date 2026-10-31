import { ChevronLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export default function AutoLoading() {
  return (
    <div className="min-h-screen bg-background text-base text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <div aria-hidden="true" className="page-back-link">
          <ChevronLeft className="size-4" />
          <span>Home</span>
        </div>
        <h1 className="page-headline">Auto</h1>
        <Skeleton aria-hidden="true" className="mt-6 h-12 rounded-xl sm:mt-8" />
        <div aria-hidden="true" className="mt-8 flex flex-col gap-5">
          <Skeleton className="h-10 w-44 rounded-lg" />
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
        <span className="sr-only">Auto wird geladen …</span>
      </main>
    </div>
  );
}
