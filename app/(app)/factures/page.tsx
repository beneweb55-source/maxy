import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import ListeFactures from "@/components/factures/ListeFactures";

export default async function PageFactures() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  return <ListeFactures />;
}
