import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import CaisseClient from "@/components/caisse/CaisseClient";

export default async function PageCaisse() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  if (user.role !== "gerant" && user.role !== "dev") redirect("/");
  return <CaisseClient role={user.role} />;
}
