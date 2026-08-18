import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import CaisseDashboard from "@/components/caisse/CaisseDashboard";

export default async function PageCaisse() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  if (user.role !== "gerant" && user.role !== "dev") redirect("/");
  return <CaisseDashboard role={user.role} />;
}
