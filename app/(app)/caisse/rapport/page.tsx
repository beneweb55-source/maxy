import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import RapportCaisse from "@/components/caisse/RapportCaisse";

export default async function PageRapportCaisse() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  if (user.role !== "gerant" && user.role !== "dev") redirect("/");

  return <RapportCaisse />;
}
