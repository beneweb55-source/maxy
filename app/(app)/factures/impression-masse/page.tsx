import { Suspense } from "react";
import ImpressionMasseFactures from "@/components/factures/ImpressionMasseFactures";

export const metadata = {
  title: "Impression en masse de factures — Gestion Maxy",
};

export default function ImpressionMasseFacturesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8">
          <p className="text-sm font-bold text-slate-500">Chargement des documents...</p>
        </div>
      }
    >
      <ImpressionMasseFactures />
    </Suspense>
  );
}
