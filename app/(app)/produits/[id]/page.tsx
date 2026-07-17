import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import FicheProduit from "@/components/produits/FicheProduit";

export default async function PageProduit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) redirect("/inventaire");
  return <FicheProduit produitId={produitId} role={user.role} />;
}
