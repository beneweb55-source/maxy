import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import FormulaireLot from "@/components/arrivages/FormulaireLot";

export default async function PageNouveauLot() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  if (user.role !== "gerant") redirect("/arrivages");
  return <FormulaireLot />;
}
