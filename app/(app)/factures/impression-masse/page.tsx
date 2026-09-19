import { redirect } from "next/navigation";
import { Suspense } from "react";
import { utilisateurCourant } from "@/lib/session";
import ImpressionMasseFactures from "@/components/factures/ImpressionMasseFactures";

export const metadata = {
  title: "Impression en masse de factures — Gestion Maxy",
};

export default async function ImpressionMasseFacturesPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8">
          <p className="text-sm font-bold text-brand-warm-grey">Chargement des documents...</p>
        </div>
      }
    >
      <ImpressionMasseFactures />
    </Suspense>
  );
}
