import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import VentesClient from "@/components/ventes/VentesClient";

export default async function PageVentes() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  return <VentesClient role={user.role} />;
}
