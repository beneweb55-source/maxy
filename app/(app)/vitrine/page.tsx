import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import Vitrine from "@/components/vitrine/Vitrine";

export default async function PageVitrine() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  // La vitrine (stock physique exposé) est réservée aux rôles opérationnels.
  if (user.role === "social_media") redirect("/inventaire");
  return <Vitrine role={user.role} />;
}
