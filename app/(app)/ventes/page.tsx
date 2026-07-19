import { redirect } from "next/navigation";
import { Suspense } from "react";
import { utilisateurCourant } from "@/lib/session";
import VentesClient from "@/components/ventes/VentesClient";

export default async function PageVentes() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  return (
    <Suspense fallback={<div className="p-4 text-sm text-brand-warm-grey">Chargement...</div>}>
      <VentesClient role={user.role} />
    </Suspense>
  );
}
