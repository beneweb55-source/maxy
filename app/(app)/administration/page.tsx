import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import AdminClient from "@/components/admin/AdminClient";

export default async function PageAdministration() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  if (user.role !== "gerant") redirect("/");
  return <AdminClient />;
}
