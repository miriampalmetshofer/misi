import { SectionNavigation } from "@/components/SectionNavigation";
import type { FuelView } from "@/features/fuel/views";

export function CarTabs({ current }: { current: FuelView | "ausgaben" }) {
  return (
    <SectionNavigation
      label="Auto-Bereich"
      scroll={false}
      sections={[
        { label: "Tanken", href: "/auto", id: "berechnen" },
        {
          label: "Reparaturen & Einkäufe",
          href: "/auto?bereich=ausgaben",
          id: "ausgaben",
        },
        {
          label: "Übersicht",
          href: "/auto?ansicht=uebersicht",
          id: "uebersicht",
        },
      ].map((tab) => ({
        href: tab.href,
        label: tab.label,
        active: tab.id === current,
      }))}
    />
  );
}
