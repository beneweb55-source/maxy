"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import {
  IconeFlecheGauche,
  IconeImprimante,
  IconeBouclier,
  IconeCrayon,
} from "@/components/icons";

interface LigneFactureDto {
  id: number;
  produit_id: number | null;
  code_interne: string;
  designation: string;
  categorie: string | null;
  prix: number;
  garantie_fin: string;
  annulee: boolean;
}

interface FactureDto {
  id: number;
  numero: string;
  date_emission: string;
  client_nom: string | null;
  client_tel: string | null;
  total: number;
  total_net: number;
  garantie_mois: number;
  garantie_fin: string;
  canal: string | null;
  annulee: boolean;
  vendeur: string;
  lignes: LigneFactureDto[];
}

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function FactureDetail({
  factureId,
  role,
}: {
  factureId: number;
  role: Role;
}) {
  const { afficher } = useToast();
  const [facture, setFacture] = useState<FactureDto | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [editionClient, setEditionClient] = useState(false);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const peutModifier = role === "gerant" || role === "dev" || role === "social_media";

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/factures/${factureId}`, { cache: "no-store" });
      const corps = (await res.json().catch(() => null)) as FactureDto | { error?: string } | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreur((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      const f = corps as FactureDto;
      setFacture(f);
      setNom(f.client_nom ?? "");
      setTel(f.client_tel ?? "");
      setErreur(null);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, [factureId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrerClient() {
    setEnvoi(true);
    try {
      const res = await fetch(`/api/factures/${factureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_nom: nom, client_tel: tel }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'enregistrement.", "erreur");
        return;
      }
      afficher("Informations client enregistrées.");
      setEditionClient(false);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  if (erreur && !facture) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}{" "}
        <Link href="/factures" className="underline">
          Retour aux factures
        </Link>
      </div>
    );
  }
  if (!facture) return <p className="p-4 text-sm text-brand-warm-grey">Chargement de la facture…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-entree print:max-w-none print:animate-none">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50 print:hidden">
        <Link href="/factures" className="lien inline-flex items-center gap-1.5 text-sm">
          <IconeFlecheGauche taille={14} />
          Factures
        </Link>
        <div className="flex items-center gap-2">
          {peutModifier && (
            <button
              type="button"
              onClick={() => setEditionClient((v) => !v)}
              className="btn btn-secondaire"
            >
              <IconeCrayon taille={14} />
              Informations client
            </button>
          )}
          <button type="button" onClick={() => window.print()} className="btn btn-primaire">
            <IconeImprimante taille={15} />
            Imprimer
          </button>
        </div>
      </div>

      {editionClient && peutModifier && (
        <div className="carte space-y-3 print:hidden">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="libelle mb-1.5" htmlFor="client-nom">
                Nom du client
              </label>
              <input
                id="client-nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. Ahmed B."
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-tel">
                Téléphone
              </label>
              <input
                id="client-tel"
                type="tel"
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                placeholder="0X XX XX XX XX"
                className="champ"
              />
            </div>
          </div>
          <div className="text-right">
            <button
              type="button"
              disabled={envoi}
              onClick={() => void enregistrerClient()}
              className="btn btn-primaire"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {facture.annulee && (
        <div className="alerte-erreur print:border print:border-danger" role="alert">
          Facture annulée — la vente correspondante a été annulée.
        </div>
      )}

      {/* Document imprimable */}
      <div className="carte print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-light-grey pb-4">
          <div>
            <img
              src="/brand/solutionmaxi-logo-fonce.svg"
              alt="Solution Maxi"
              className="h-8 w-auto"
            />
            <p className="mt-2 text-sm font-bold text-brand-black">Solution Maxi</p>
            <p className="text-xs text-brand-warm-grey">Matériel informatique — vente et reprise</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">FACTURE</h1>
            <p className="font-mono text-sm font-bold text-brand-orange">{facture.numero}</p>
            <p className="mt-1 text-xs text-brand-warm-grey">
              Émise le {dateFr(facture.date_emission)}
            </p>
            {facture.canal && (
              <p className="text-xs text-brand-warm-grey">Canal : {facture.canal}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-brand-light-grey py-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-grey">
              Client
            </p>
            <p className="mt-0.5 font-semibold text-brand-black">
              {facture.client_nom || "Client comptoir"}
            </p>
            {facture.client_tel && (
              <p className="text-sm text-brand-warm-grey">{facture.client_tel}</p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-grey">
              Vendeur
            </p>
            <p className="mt-0.5 font-semibold text-brand-black">{facture.vendeur}</p>
          </div>
        </div>

        <div className="overflow-x-auto py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-light-grey">
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-grey">
                  Code
                </th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-grey">
                  Désignation
                </th>
                <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-brand-grey">
                  Garantie jusqu&apos;au
                </th>
                <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-brand-grey">
                  Prix
                </th>
              </tr>
            </thead>
            <tbody>
              {facture.lignes.map((l) => (
                <tr
                  key={l.id}
                  className={`border-b border-brand-light-grey/40 last:border-0 ${
                    l.annulee ? "text-brand-grey" : ""
                  }`}
                >
                  <td className="px-2 py-2 font-mono text-xs text-brand-warm-grey">
                    {l.code_interne}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`font-medium ${l.annulee ? "line-through" : ""}`}>
                      {l.designation}
                    </span>
                    {l.annulee && (
                      <span className="ml-1 rounded bg-danger/10 px-1 py-0.5 text-[10px] font-semibold text-danger">
                        retourné
                      </span>
                    )}
                    {l.categorie && (
                      <span className="block text-xs text-brand-warm-grey">{l.categorie}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-xs">
                    {l.annulee ? "—" : dateFr(l.garantie_fin)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-semibold ${
                      l.annulee ? "line-through" : ""
                    }`}
                  >
                    {formaterDA(l.prix)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {facture.total_net !== facture.total && (
                <tr>
                  <td colSpan={3} className="px-2 pt-3 text-right text-xs text-brand-warm-grey">
                    Total initial
                  </td>
                  <td className="px-2 pt-3 text-right text-xs text-brand-warm-grey line-through">
                    {formaterDA(facture.total)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-brand-black/80">
                <td colSpan={3} className="px-2 py-3 text-right font-bold">
                  {facture.total_net !== facture.total ? "TOTAL NET (après retour)" : "TOTAL"}
                </td>
                <td className="px-2 py-3 text-right text-lg font-extrabold text-brand-orange">
                  {formaterDA(facture.total_net)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bon de garantie — imprimé avec la facture */}
        <div className="rounded-lg border border-brand-orange/40 bg-brand-glow/10 p-4 print:border print:border-brand-grey">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-black">
            <IconeBouclier taille={15} />
            Bon de garantie — {facture.garantie_mois} mois
          </p>
          <p className="mt-1.5 text-xs text-brand-smooth">
            Chaque produit figurant sur cette facture est garanti{" "}
            <strong>{facture.garantie_mois} mois</strong> à compter du{" "}
            {dateFr(facture.date_emission)}, soit jusqu&apos;au{" "}
            <strong>{dateFr(facture.garantie_fin)}</strong>. La garantie couvre les pannes
            matérielles constatées en usage normal. Elle ne couvre pas la casse, l&apos;oxydation,
            les dommages dus à une mauvaise utilisation ni les interventions par un tiers.
          </p>
          <p className="mt-2 text-xs text-brand-warm-grey">
            Présentez cette facture pour toute demande de prise en charge.
          </p>
        </div>

        <div className="mt-6 flex items-end justify-between gap-6">
          <p className="text-[11px] text-brand-warm-grey">
            Facture générée automatiquement le {dateFr(facture.date_emission)}.
          </p>
          <div className="text-center">
            <div className="h-14 w-44 border-b border-brand-grey" />
            <p className="mt-1 text-[11px] text-brand-warm-grey">Cachet et signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
