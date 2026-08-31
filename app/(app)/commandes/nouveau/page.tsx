import { redirect } from "next/navigation";
import { Suspense } from "react";
import { utilisateurCourant } from "@/lib/session";
import PosCreationCommande from "@/components/commandes/PosCreationCommande";

export default async function PageNouvelleCommande() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold">Chargement de la caisse...</div>}>
      <PosCreationCommande />
    </Suspense>
  );
}
