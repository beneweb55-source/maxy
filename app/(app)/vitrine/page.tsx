import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import Vitrine from "@/components/vitrine/Vitrine";

export default async function PageVitrine() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  // Tous les rôles voient la vitrine ; seuls les rôles opérationnels peuvent
  // en retirer des produits (contrôlé dans le composant et côté API).
  return <Vitrine role={user.role} />;
}
