import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import ListeRapports from "@/components/rapports/ListeRapports";

export default async function PageRapports() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  return <ListeRapports />;
}
