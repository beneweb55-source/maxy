import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import EcranLot from "@/components/lots/EcranLot";

export default async function PageLot({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) redirect("/arrivages");
  return <EcranLot lotId={lotId} role={user.role} />;
}
