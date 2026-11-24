import Image from "next/image";
import { cn } from "cn";

import type { GroceryStore } from "./stores";

// Source: https://github.com/openfoodfacts/brand-images/tree/main/xx/stores
const logos = {
  spar: { src: "/stores/spar.png", width: 192, height: 39 },
  hofer: { src: "/stores/hofer.png", width: 107, height: 128 },
  billa: { src: "/stores/billa.svg", width: 1024, height: 319 },
};

export function StoreLogo({ store }: { store: GroceryStore }) {
  return (
    <span className={cn(
      "flex h-6 w-10 shrink-0 items-center justify-center rounded-sm px-0.5",
      store === "billa" ? "bg-[#c8102e]" : "bg-white",
    )}>
      <Image
        {...logos[store]}
        alt={store.toUpperCase()}
        className="h-auto max-h-full w-auto max-w-full object-contain"
        unoptimized
      />
    </span>
  );
}
