import { Suspense } from "react";
import ImpressionMasseCommandes from "@/components/commandes/ImpressionMasseCommandes";

export const metadata = {
  title: "Impression en masse de commandes — Gestion Maxy",
};

export default function ImpressionMasseCommandesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8">
          <p className="text-sm font-bold text-brand-warm-grey">Chargement des documents...</p>
        </div>
      }
    >
      <ImpressionMasseCommandes />
    </Suspense>
  );
}
