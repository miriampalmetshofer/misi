import { FuelSplit } from "@/features/fuel/FuelSplit";
import { getFuelFillUps } from "@/features/fuel/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tanken",
};

export default async function TankenPage() {
  const fillUps = await getFuelFillUps();

  return <FuelSplit fillUps={fillUps} />;
}
