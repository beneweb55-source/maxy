"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StatutLot } from "@prisma/client";
import { formaterDA } from "@/lib/caisse";
import { useLangue } from "@/lib/i18n/contexte";

interface LigneRapport {
  lot_id: number;
  fournisseur: string;
  date_entree: string;
  statut_lot: StatutLot;
  nb_produits: number;
  valeur_achat: number;
  decisions_requises: number;
  decisions_prises: number;
  resume: {
    ok: number;
    a_reparer: number;
    manque_piece: number;
    hs: number;
  };
}

export default function ListeRapports() {
  const router = useRouter();
  const { langue, t } = useLangue();
  const [rapports, setRapports] = useState<LigneRapport[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    fetch("/api/rapports")
      .then(async (res) => {
        if (!res.ok) {
          const corps = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(corps?.error ?? t("listeRapports.erreurChargement"));
        }
        return res.json() as Promise<{ rapports: LigneRapport[] }>;
      })
      .then((d) => {
        if (!annule) setRapports(d.rapports);
      })
      .catch((e: Error) => {
        if (!annule) setErreur(e.message);
      });
    return () => {
      annule = true;
    };
  }, [t]);

  if (erreur) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}
      </div>
    );
  }
  if (rapports === null) {
    return <p className="p-4 text-sm text-brand-warm-grey">{t("listeRapports.chargement")}</p>;
  }

  const aValider = rapports.filter((r) => r.statut_lot === "teste");
  const valides = rapports.filter((r) => r.statut_lot === "valide");

  const Tableau = ({ lignes, vide }: { lignes: LigneRapport[]; vide: string }) =>
    lignes.length === 0 ? (
      <p className="carte border-dashed text-sm text-brand-warm-grey">{vide}</p>
    ) : (
      <div className="overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-brand-light-grey/25">
            <tr>
              <th className="entete-table">{t("listeRapports.colLot")}</th>
              <th className="entete-table">{t("listeRapports.colFournisseur")}</th>
              <th className="entete-table text-center">{t("listeRapports.colStatut")}</th>
              <th className="entete-table">{t("listeRapports.colResume")}</th>
              <th className="entete-table text-right">{t("listeRapports.colValeur")}</th>
              <th className="entete-table text-right">{t("listeRapports.colDecisions")}</th>
            </tr>
          </thead>
          <tbody className="">
            {lignes.map((r) => (
              <tr
                key={r.lot_id}
                onClick={() => router.push(`/rapports/${r.lot_id}`)}
                className="ligne-table border-b border-brand-light-grey/30 last:border-0 cursor-pointer"
              >
                <td className="px-3 py-2.5 font-semibold">
                  {t("listeRapports.lotCloture", {
                    id: r.lot_id,
                    date: new Date(r.date_entree).toLocaleDateString(langue === "en" ? "en-GB" : "fr-FR"),
                  })}
                </td>
                <td className="px-3 py-2.5">{r.fournisseur}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.statut_lot === 'teste' ? 'bg-brand-glow/60 text-brand-orange' : 'bg-succes/10 text-succes'}`}>
                    {r.statut_lot === 'teste' ? t("listeRapports.aValider") : t("listeRapports.valide")}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm text-brand-warm-grey">
                  {[
                    r.resume.ok > 0 && t("listeRapports.resumeOk", { n: r.resume.ok }),
                    r.resume.a_reparer > 0 && t("listeRapports.resumeAReparer", { n: r.resume.a_reparer }),
                    r.resume.manque_piece > 0 && t("listeRapports.resumeManquePiece", { n: r.resume.manque_piece }),
                    r.resume.hs > 0 && t("listeRapports.resumeHs", { n: r.resume.hs })
                  ].filter(Boolean).join(' · ')}
                </td>
                <td className="px-3 py-2.5 text-right">{formaterDA(r.valeur_achat)}</td>
                <td className="px-3 py-2.5 text-right">
                  {r.decisions_requises === 0 ? (
                    <span className="text-brand-grey">{t("listeRapports.aucuneRequise")}</span>
                  ) : (
                    <span
                      className={`font-semibold ${
                        r.decisions_prises < r.decisions_requises
                          ? "text-brand-orange"
                          : "text-succes"
                      }`}
                    >
                      {r.decisions_prises}/{r.decisions_requises}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="space-y-6 animate-entree">
      <div className="pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">{t("listeRapports.titre")}</h1>
      </div>
      <section className="space-y-2">
        <h2 className="libelle text-brand-orange">{t("listeRapports.aValider")}</h2>
        <Tableau lignes={aValider} vide={t("listeRapports.videAValider")} />
      </section>
      <section className="space-y-2">
        <h2 className="libelle text-succes">{t("listeRapports.sectionValides")}</h2>
        <Tableau lignes={valides} vide={t("listeRapports.videValides")} />
      </section>
    </div>
  );
}
