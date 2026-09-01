import { redirect } from "next/navigation";
import { Suspense } from "react";
import { utilisateurCourant } from "@/lib/session";
import DashboardCommandes from "@/components/commandes/DashboardCommandes";

export default async function PageCommandes() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold">Chargement des commandes...</div>}>
      <DashboardCommandes />
    </Suspense>
  );
}
