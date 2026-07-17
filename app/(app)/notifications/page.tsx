import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import PageNotifications from "@/components/notifications/PageNotifications";

export default async function Notifications() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  return <PageNotifications />;
}
