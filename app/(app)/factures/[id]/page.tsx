import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import FactureDetail from "@/components/factures/FactureDetail";

export default async function PageFacture({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  const { id } = await params;
  const factureId = Number(id);
  if (!Number.isInteger(factureId)) redirect("/factures");
  return <FactureDetail factureId={factureId} role={user.role} />;
}
