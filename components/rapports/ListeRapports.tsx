"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StatutLot } from "@prisma/client";
import { formaterDA } from "@/lib/caisse";

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
  const [rapports, setRapports] = useState<LigneRapport[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    fetch("/api/rapports")
      .then(async (res) => {
        if (!res.ok) {
          const corps = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(corps?.error ?? "Erreur lors du chargement des rapports.");
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
  }, []);

  if (erreur) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}
      </div>
    );
  }
  if (rapports === null) {
    return <p className="p-4 text-sm text-brand-warm-grey">Chargement des rapports…</p>;
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
              <th className="entete-table">Lot</th>
              <th className="entete-table">Fournisseur</th>
              <th className="entete-table text-center">Statut</th>
              <th className="entete-table">Résumé des tests</th>
              <th className="entete-table text-right">Valeur d'achat</th>
              <th className="entete-table text-right">Décisions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-light-grey/50">
            {lignes.map((r) => (
              <tr
                key={r.lot_id}
                onClick={() => router.push(`/rapports/${r.lot_id}`)}
                className="cursor-pointer transition hover:bg-brand-glow/15"
              >
                <td className="px-3 py-2.5 font-semibold">
                  n°{r.lot_id} — Clôturé le {new Date(r.date_entree).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-3 py-2.5">{r.fournisseur}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.statut_lot === 'teste' ? 'bg-brand-glow/60 text-brand-orange' : 'bg-succes/10 text-succes'}`}>
                    {r.statut_lot === 'teste' ? 'À valider' : 'Validé'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm text-brand-warm-grey">
                  {[
                    r.resume.ok > 0 && `${r.resume.ok} OK`,
                    r.resume.a_reparer > 0 && `${r.resume.a_reparer} à réparer`,
                    r.resume.manque_piece > 0 && `${r.resume.manque_piece} manque pièce`,
                    r.resume.hs > 0 && `${r.resume.hs} HS`
                  ].filter(Boolean).join(' · ')}
                </td>
                <td className="px-3 py-2.5 text-right">{formaterDA(r.valeur_achat)}</td>
                <td className="px-3 py-2.5 text-right">
                  {r.decisions_requises === 0 ? (
                    <span className="text-brand-grey">aucune requise</span>
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
    <div className="space-y-6">
      <h1>Rapports</h1>
      <section className="space-y-2">
        <h2 className="libelle text-brand-orange">À valider</h2>
        <Tableau lignes={aValider} vide="Aucun rapport en attente de validation." />
      </section>
      <section className="space-y-2">
        <h2 className="libelle text-succes">Validés</h2>
        <Tableau lignes={valides} vide="Aucun rapport validé pour le moment." />
      </section>
    </div>
  );
}
