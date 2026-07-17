"use client";

import { useEffect, useState } from "react";
import { formaterDA } from "@/lib/caisse";
import { IconeChevronGauche } from "@/components/icons";
import Link from "next/link";

export default function RapportCaisse() {
  const [donnees, setDonnees] = useState<any>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      try {
        const res = await fetch("/api/caisse");
        const corps = await res.json();
        if (!res.ok) {
          setErreur(corps.error || "Erreur de chargement");
          return;
        }
        setDonnees(corps);
      } catch {
        setErreur("Erreur réseau");
      }
    }
    void charger();
  }, []);

  if (erreur) return <div className="p-4 text-danger">{erreur}</div>;
  if (!donnees) return <div className="p-4 text-brand-warm-grey">Génération du rapport...</div>;

  const { soldes, repartition, graphique_soldes } = donnees;

  return (
    <div className="space-y-6 max-w-4xl mx-auto carte animate-entree print:shadow-none print:border-none print:bg-transparent print:p-0">
      <div className="flex justify-between items-start print:hidden">
        <Link href="/caisse" className="btn btn-secondaire">
          <IconeChevronGauche taille={15} />
          Retour à la caisse
        </Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primaire">
          Imprimer le rapport
        </button>
      </div>

      <div className="border-b-2 border-brand-black pb-4">
        <img src="/brand/solutionmaxi-logo-clair.svg" alt="SolutionMaxi" className="h-6 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight">Bilan Financier</h1>
        <p className="text-brand-warm-grey mt-1">
          Généré le {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="p-4 border border-brand-light-grey rounded-lg">
          <p className="text-sm font-semibold text-brand-warm-grey uppercase tracking-wider">Solde Total</p>
          <p className="text-3xl font-bold mt-2">{formaterDA(soldes.total)}</p>
        </div>
        <div className="p-4 border border-brand-light-grey rounded-lg">
          <p className="text-sm font-semibold text-brand-warm-grey uppercase tracking-wider">Fonds de Réserve</p>
          <p className="text-3xl font-bold mt-2">{formaterDA(soldes.reserve)}</p>
        </div>
        <div className="p-4 border border-brand-light-grey rounded-lg">
          <p className="text-sm font-semibold text-brand-warm-grey uppercase tracking-wider">Disponible</p>
          <p className="text-3xl font-bold mt-2">{formaterDA(soldes.disponible)}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold border-b border-brand-light-grey pb-2 mb-4">Statistiques du mois en cours ({repartition.mois})</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-warm-grey">Bénéfice (somme des marges)</span>
            <span className="font-bold text-succes">{formaterDA(repartition.benefice_mois)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-warm-grey">État de la répartition</span>
            <span className="font-semibold">{repartition.deja_appliquee ? "Déjà appliquée" : "En attente"}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold border-b border-brand-light-grey pb-2 mb-4">Évolution des soldes (6 derniers mois)</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-brand-light-grey/30">
              <th className="py-2 px-4 text-left border border-brand-light-grey">Mois</th>
              <th className="py-2 px-4 text-right border border-brand-light-grey">Solde fin de mois</th>
            </tr>
          </thead>
          <tbody>
            {graphique_soldes?.mois?.map((s: any) => (
              <tr key={s.label} className="ligne-table">
                <td className="py-2 px-4 border border-brand-light-grey">{s.label}</td>
                <td className="py-2 px-4 border border-brand-light-grey text-right font-semibold">{formaterDA(s.solde)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-12 text-center text-xs text-brand-warm-grey print:block">
        Document généré par Gestion Maxy - Confidentiel
      </div>
    </div>
  );
}
