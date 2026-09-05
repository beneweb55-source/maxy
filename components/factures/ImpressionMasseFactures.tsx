"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formaterDA } from "@/lib/caisse";
import TemplateFactureA4 from "@/components/factures/TemplateFactureA4";
import {
  IconeImprimante,
  IconeFlecheGauche,
  IconeBouclier,
  IconeBillet,
} from "@/components/icons";

interface LigneFactureDto {
  id: number;
  produit_id: number | null;
  code_interne: string;
  designation: string;
  categorie: string | null;
  prix: number;
  garantie_fin: string;
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
  type_facture: string | null;
  client_adresse: string | null;
  client_rc: string | null;
  client_nif: string | null;
  client_ai: string | null;
  client_nis: string | null;
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
    rib: string | null;
    cachet: string | null;
  };
}

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ImpressionMasseFactures() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsString = searchParams.get("ids") || "";
  const autoPrint = searchParams.get("auto") === "1";

  const [factures, setFactures] = useState<FactureDto[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [formatTicket, setFormatTicket] = useState(false);

  const chargerFactures = useCallback(async () => {
    if (!idsString.trim()) {
      setErreur("Aucun identifiant de facture spécifié pour l'impression.");
      setChargement(false);
      return;
    }

    try {
      const res = await fetch(`/api/factures?ids=${encodeURIComponent(idsString)}`);
      if (!res.ok) {
        throw new Error("Erreur lors de la récupération des factures.");
      }
      const data = await res.json();
      setFactures(data.factures || []);
    } catch (err: any) {
      setErreur(err.message || "Erreur réseau.");
    } finally {
      setChargement(false);
    }
  }, [idsString]);

  useEffect(() => {
    void chargerFactures();
  }, [chargerFactures]);

  useEffect(() => {
    if (!chargement && factures.length > 0 && autoPrint) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [chargement, factures, autoPrint]);

  const totalGlobal = factures.reduce((s, f) => s + f.total_net, 0);

  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-brand-light-grey/10 font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-brand-warm-grey">Préparation des factures pour l&apos;impression...</p>
        </div>
      </div>
    );
  }

  if (erreur || factures.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 font-sans">
        <div className="carte max-w-md w-full text-center space-y-4 p-6">
          <div className="text-danger font-black text-lg">Impression Impossible</div>
          <p className="text-xs text-brand-warm-grey font-medium">{erreur || "Aucune facture trouvée pour ces identifiants."}</p>
          <Link href="/factures" className="btn btn-primaire w-full justify-center">
            Retour aux Factures
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-paper dark:bg-brand-paper p-4 sm:p-8 font-sans">
      
      {/* ================= BARRE DE CONTROLE FLOTTANTE (Masquée à l'impression) ================= */}
      <div className="print:hidden sticky top-4 z-40 max-w-5xl mx-auto mb-8 p-4 rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <Link
            href="/factures"
            className="btn btn-secondaire text-xs h-11 px-3 rounded-xl font-bold flex items-center gap-1.5 shrink-0"
          >
            <IconeFlecheGauche taille={14} />
            <span>Factures</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-brand-black dark:text-white">
                Impression en Masse ({factures.length} facture{factures.length > 1 ? "s" : ""})
              </span>
            </div>
            <div className="text-xs font-bold text-brand-orange font-mono">
              Total du lot : {formaterDA(totalGlobal)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Format Toggle */}
          <div className="flex bg-brand-light-grey/30 dark:bg-white/5 p-1 rounded-xl border border-brand-light-grey dark:border-white/10">
            <button
              type="button"
              onClick={() => setFormatTicket(false)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                !formatTicket
                  ? "bg-white dark:bg-brand-paper text-brand-orange shadow-xs"
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              Format A4
            </button>
            <button
              type="button"
              onClick={() => setFormatTicket(true)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                formatTicket
                  ? "bg-white dark:bg-brand-paper text-brand-orange shadow-xs"
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              Ticket POS (80mm)
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primaire h-11 px-5 rounded-xl font-black text-xs shadow-lg shadow-brand-orange/20 flex items-center gap-2"
          >
            <IconeImprimante taille={16} />
            <span>Imprimer tout ({factures.length})</span>
          </button>
        </div>

      </div>

      {/* ================= CONTENU IMPRIMABLE (Multi-Pages avec Sauts de Page) ================= */}
      <div className="max-w-4xl mx-auto space-y-12 print:space-y-0 print:m-0 print:p-0 print:max-w-none">
        {factures.map((facture, index) => {
          const entreprise = facture.entreprise;
          const estDerniere = index === factures.length - 1;

          if (formatTicket) {
            return (
              <div
                key={facture.id}
                className={`facture-feuille mx-auto max-w-[80mm] w-full bg-white text-black p-4 text-[11px] font-mono leading-tight shadow-md print:shadow-none print:p-0 print:border-none ${
                  !estDerniere ? "page-break-after-always" : ""
                }`}
              >
                <div className="text-center pb-3 border-b border-dashed border-black mb-3">
                  <h1 className="text-sm font-black uppercase">{entreprise?.nom || "SOLUTION MAXI"}</h1>
                  <p className="text-[10px]">{entreprise?.adresse || "Alger, Algérie"}</p>
                  <p className="text-[10px]">Tél: {entreprise?.tel || "0000 00 00 00"}</p>
                  <div className="mt-2 text-xs font-black">
                    {facture.type_facture === "PROFORMA" ? "DEVIS PROFORMA" : "TICKET DE VENTE"}
                  </div>
                  <div className="text-[10px]">N° {facture.numero} - {dateFr(facture.date_emission)}</div>
                </div>

                <div className="mb-3 text-[10px] space-y-0.5">
                  <div>Client: <strong>{facture.client_nom || "Client Particulier"}</strong></div>
                  {facture.client_tel && <div>Tél: {facture.client_tel}</div>}
                  <div>Vendeur: {facture.vendeur}</div>
                </div>

                <table className="w-full border-collapse text-[10px] mb-3">
                  <thead>
                    <tr className="border-b border-black text-left">
                      <th className="py-1">Art.</th>
                      <th className="py-1 text-center">Qté</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dotted divide-black">
                    {facture.lignes.map((ligne) => (
                      <tr key={ligne.id}>
                        <td className="py-1 pr-1 font-sans">
                          <div className="font-bold">{ligne.code_interne}</div>
                          <div className="text-[9px] text-slate-700 truncate max-w-[140px]">{ligne.designation}</div>
                        </td>
                        <td className="py-1 text-center font-bold">1</td>
                        <td className="py-1 text-right font-black font-mono">{formaterDA(ligne.prix)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pt-2 border-t border-dashed border-black space-y-1 mb-4">
                  <div className="flex justify-between font-black text-xs">
                    <span>TOTAL TTC :</span>
                    <span className="font-mono">{formaterDA(facture.total_net)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Règlement :</span>
                    <span className="uppercase">{facture.mode_paiement || "Espèces"}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Garantie :</span>
                    <span>{facture.garantie_mois} Mois (jusqu&apos;au {dateFr(facture.garantie_fin)})</span>
                  </div>
                </div>

                <div className="text-center text-[9px] pt-3 border-t border-black font-sans space-y-0.5">
                  <p className="font-bold">Merci de votre confiance !</p>
                  <p className="italic">Conservez ce ticket pour la garantie.</p>
                </div>
              </div>
            );
          }

          // Format A4 Standard — Template partagé unique
          return (
            <div
              key={facture.id}
              className={`${!estDerniere ? "page-break-after-always" : ""}`}
            >
              <TemplateFactureA4
                facture={facture}
                showHeader={true}
                showCachet={true}
                showActions={false}
                forPdf={true}
              />
            </div>
          );
        })}
      </div>

      {/* Styles Globaux d'Impression pour Gestion des Pages Multiples */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          nav, header, aside, .print\\:hidden {
            display: none !important;
          }
          .page-break-after-always {
            page-break-after: always !important;
            break-after: page !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

    </div>
  );
}
