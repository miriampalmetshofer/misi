import { redirect } from "next/navigation";

export default async function TankenPage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string | string[] }>;
}) {
  const { ansicht } = await searchParams;
  redirect(ansicht === "uebersicht" ? "/auto?ansicht=uebersicht" : "/auto");
}
