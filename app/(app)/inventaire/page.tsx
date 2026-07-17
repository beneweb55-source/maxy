import { Suspense } from "react";
import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import Inventaire from "@/components/inventaire/Inventaire";

export default async function PageInventaire() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  return (
    <Suspense fallback={<p className="p-4 text-sm text-brand-warm-grey">Chargement…</p>}>
      <Inventaire role={user.role} />
    </Suspense>
  );
}
