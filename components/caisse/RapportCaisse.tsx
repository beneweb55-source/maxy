"use client";

import { useEffect, useState } from "react";
import { formaterDA } from "@/lib/caisse";
import { useLangue } from "@/lib/i18n/contexte";
import { IconeChevronGauche } from "@/components/icons";
import Link from "next/link";

export default function RapportCaisse() {
  const { langue, t } = useLangue();
  const [donnees, setDonnees] = useState<any>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      try {
        const res = await fetch("/api/caisse");
        const corps = await res.json();
        if (!res.ok) {
          setErreur(corps.error || t("rapportCaisse.erreurChargement"));
          return;
        }
        setDonnees(corps);
      } catch {
        setErreur(t("rapportCaisse.erreurReseau"));
      }
    }
    void charger();
  }, [t]);

  if (erreur) return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="rounded-full bg-danger/10 p-4">
        <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <p className="text-sm font-bold text-danger">{erreur}</p>
    </div>
  );
  if (!donnees) return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto animate-pulse">
      <div className="h-6 w-48 bg-brand-light-grey/40 rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <div className="carte h-20 bg-brand-light-grey/20 rounded-xl" />
        <div className="carte h-20 bg-brand-light-grey/20 rounded-xl" />
      </div>
      <div className="carte h-40 bg-brand-light-grey/20 rounded-xl" />
    </div>
  );

  const { soldes, repartition, graphique_soldes } = donnees;

  return (
    <div className="space-y-6 max-w-4xl mx-auto carte animate-entree print:shadow-none print:border-none print:bg-transparent print:p-0">
      <div className="flex justify-between items-start print:hidden">
        <Link href="/caisse" className="btn btn-secondaire">
          <IconeChevronGauche taille={15} />
          {t("rapportCaisse.retourCaisse")}
        </Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primaire">
          {t("rapportCaisse.imprimer")}
        </button>
      </div>

      <div className="border-b-2 border-brand-black pb-4">
        <img src="/brand/solutionmaxi-logo-clair.svg" alt="SolutionMaxi" className="h-6 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight">{t("rapportCaisse.titre")}</h1>
        <p className="text-brand-warm-grey mt-1">
          {t("rapportCaisse.genereLe", {
            date: new Date().toLocaleDateString(langue === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="p-4 border border-brand-light-grey rounded-lg">
          <p className="text-sm font-semibold text-brand-warm-grey uppercase tracking-wider">{t("rapportCaisse.soldeTotal")}</p>
          <p className="text-3xl font-bold mt-2">{formaterDA(soldes.total)}</p>
        </div>
        <div className="p-4 border border-brand-light-grey rounded-lg">
          <p className="text-sm font-semibold text-brand-warm-grey uppercase tracking-wider">{t("rapportCaisse.fondsReserve")}</p>
          <p className="text-3xl font-bold mt-2">{formaterDA(soldes.reserve)}</p>
        </div>
        <div className="p-4 border border-brand-light-grey rounded-lg">
          <p className="text-sm font-semibold text-brand-warm-grey uppercase tracking-wider">{t("rapportCaisse.disponible")}</p>
          <p className="text-3xl font-bold mt-2">{formaterDA(soldes.disponible)}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold border-b border-brand-light-grey pb-2 mb-4">{t("rapportCaisse.statsMois", { mois: repartition.mois })}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-warm-grey">{t("rapportCaisse.benefice")}</span>
            <span className="font-bold text-succes">{formaterDA(repartition.benefice_mois)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-warm-grey">{t("rapportCaisse.etatRepartition")}</span>
            <span className="font-semibold">{repartition.deja_appliquee ? t("rapportCaisse.dejaAppliquee") : t("rapportCaisse.enAttente")}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold border-b border-brand-light-grey pb-2 mb-4">{t("rapportCaisse.evolutionSoldes")}</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-brand-light-grey/30">
              <th className="py-2 px-4 text-left border border-brand-light-grey">{t("rapportCaisse.colMois")}</th>
              <th className="py-2 px-4 text-right border border-brand-light-grey">{t("rapportCaisse.colSoldeFin")}</th>
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
        {t("rapportCaisse.piedPage")}
      </div>
    </div>
  );
}
