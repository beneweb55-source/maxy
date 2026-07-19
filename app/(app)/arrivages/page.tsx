import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import ListeLots from "@/components/arrivages/ListeLots";

export default async function PageArrivages() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  if (user.role === "social_media") redirect("/");
  return <ListeLots role={user.role} />;
}
