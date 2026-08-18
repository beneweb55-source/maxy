import { redirect } from "next/navigation";
import { Suspense } from "react";
import { utilisateurCourant } from "@/lib/session";
import CaisseClient from "@/components/caisse/CaisseClient";

export default async function PageCaisse() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  return (
    <Suspense fallback={<div className="p-4 text-sm text-brand-warm-grey">Chargement de la caisse...</div>}>
      <CaisseClient role={user.role} />
    </Suspense>
  );
}
