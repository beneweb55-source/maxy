import { redirect } from "next/navigation";
import { Suspense } from "react";
import { utilisateurCourant } from "@/lib/session";
import FicheCommande from "@/components/commandes/FicheCommande";

export default async function PageDetailCommande({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");

  const { id } = await params;
  const commandeId = Number(id);

  return (
    <Suspense fallback={<div className="p-8 text-center text-brand-warm-grey font-bold">Chargement de la commande...</div>}>
      <FicheCommande commandeId={commandeId} />
    </Suspense>
  );
}
