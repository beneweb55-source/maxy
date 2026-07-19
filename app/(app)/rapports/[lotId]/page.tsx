import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import RapportDetail from "@/components/rapports/RapportDetail";

export default async function PageRapport({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  if (user.role === "social_media") redirect("/");
  const { lotId } = await params;
  const id = Number(lotId);
  if (!Number.isInteger(id)) redirect("/rapports");
  return <RapportDetail lotId={id} role={user.role} />;
}
