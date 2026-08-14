"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { montantEnLettres } from "@/lib/nombres";
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
  mode_paiement: string | null;
  annulee: boolean;
  vendeur: string;
  lignes: LigneFactureDto[];
  entreprise?: {
    nom: string;
    adresse: string;
    tel: string;
    rc: string;
    nif: string;
    nis: string;
    art: string;
  };
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
      <div className="carte print:border-0 print:p-0 print:shadow-none print:m-0 print:bg-white text-black">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b-2 border-brand-black pb-6">
          <div className="flex-1">
            <img
              src="/brand/solutionmaxi-logo-fonce.svg"
              alt="Logo"
              className="h-12 w-auto mb-3"
            />
            <h2 className="text-lg font-bold uppercase tracking-wide text-brand-black">{facture.entreprise?.nom || "Solution Maxi"}</h2>
            <p className="text-sm font-medium mt-1">Matériel informatique — vente et reprise</p>
            <div className="mt-3 text-xs text-brand-warm-grey space-y-0.5">
              <p><strong>Adresse :</strong> {facture.entreprise?.adresse || "Alger, Algérie"}</p>
              <p><strong>Tél :</strong> {facture.entreprise?.tel || "0000 00 00 00"}</p>
            </div>
          </div>
          <div className="text-right flex-1 border-l-2 border-brand-light-grey pl-6 sm:border-l-0 sm:pl-0">
            <h1 className="text-3xl font-black tracking-widest text-brand-black uppercase mb-1">FACTURE</h1>
            <p className="text-sm font-bold text-brand-orange mb-3">N° {facture.numero}</p>
            <div className="text-xs text-brand-warm-grey space-y-0.5">
              <p><strong>RC :</strong> {facture.entreprise?.rc || "RC XXXXXXXXX"}</p>
              <p><strong>NIF :</strong> {facture.entreprise?.nif || "NIF XXXXXXXXX"}</p>
              <p><strong>NIS :</strong> {facture.entreprise?.nis || "NIS XXXXXXXXX"}</p>
              <p><strong>ART :</strong> {facture.entreprise?.art || "ART XXXXXXXXX"}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-brand-light-grey inline-block text-left w-full sm:w-auto sm:text-right">
              <p className="text-xs text-brand-black">
                <strong>Émise le :</strong> {dateFr(facture.date_emission)}
              </p>
              {facture.canal && (
                <p className="text-xs text-brand-black"><strong>Canal :</strong> {facture.canal}</p>
              )}
            </div>
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
              <tr className="border-t-[3px] border-brand-black">
                <td colSpan={3} className="px-2 py-4 text-right text-sm font-bold uppercase tracking-wide">
                  {facture.total_net !== facture.total ? "TOTAL NET (après retour)" : "TOTAL À PAYER"}
                </td>
                <td className="px-2 py-4 text-right text-xl font-black text-brand-black">
                  {formaterDA(facture.total_net)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 p-4 bg-brand-light-grey/20 rounded-md print:bg-transparent print:border print:border-brand-black">
          <p className="text-sm font-semibold text-brand-black uppercase tracking-wide mb-1">
            Arrêtée la présente facture à la somme de :
          </p>
          <p className="text-sm italic font-bold text-brand-black">
            {montantEnLettres(facture.total_net)}.
          </p>
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

        <div className="mt-6 flex flex-col gap-2 border-t border-brand-light-grey pt-4">
          <p className="text-[11px] text-brand-black">
            <strong>Mode de règlement :</strong>{" "}
            {facture.mode_paiement === "virement"
              ? "Virement bancaire (CCP / BaridiMob)"
              : facture.mode_paiement === "cheque"
                ? "Chèque"
                : "Espèces"}
          </p>
          <p className="text-[10px] text-brand-warm-grey italic">
            TVA non applicable, art. 293 B du CGI. (Régime de l&apos;IFU). Conditions de paiement : à réception de facture. Aucun escompte consenti pour paiement anticipé.
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
