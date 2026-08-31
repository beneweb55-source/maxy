"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formaterDA } from "@/lib/caisse";
import { montantEnLettres } from "@/lib/nombres";
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
          <p className="text-sm font-bold text-slate-600">Préparation des factures pour l&apos;impression...</p>
        </div>
      </div>
    );
  }

  if (erreur || factures.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 font-sans">
        <div className="carte max-w-md w-full text-center space-y-4 p-6">
          <div className="text-danger font-black text-lg">Impression Impossible</div>
          <p className="text-xs text-slate-600 font-medium">{erreur || "Aucune facture trouvée pour ces identifiants."}</p>
          <Link href="/factures" className="btn btn-primaire w-full justify-center">
            Retour aux Factures
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 p-4 sm:p-8 font-sans">
      
      {/* ================= BARRE DE CONTROLE FLOTTANTE (Masquée à l'impression) ================= */}
      <div className="print:hidden sticky top-4 z-40 max-w-5xl mx-auto mb-8 p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
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
              <span className="text-base font-black text-slate-900 dark:text-white">
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
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setFormatTicket(false)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                !formatTicket
                  ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Format A4
            </button>
            <button
              type="button"
              onClick={() => setFormatTicket(true)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                formatTicket
                  ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
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
                    {facture.type_facture === "proforma" ? "DEVIS PROFORMA" : "TICKET DE VENTE"}
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

          // Format A4 Standard
          return (
            <div
              key={facture.id}
              className={`facture-feuille bg-white text-black p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none text-[13px] leading-tight ${
                !estDerniere ? "page-break-after-always" : ""
              }`}
            >
              {/* En-tête : Info entreprise à gauche, Logo à droite */}
              <div className="flex justify-between items-start gap-4 mb-6">
                <div className="bg-[#e5e7eb] p-4 rounded-xl rounded-tl-none w-[45%] text-xs border border-[#d1d5db] relative">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-1.5">
                    {entreprise?.nom || "Solution Maxi"}
                  </h2>
                  <p className="mb-2 font-medium">{entreprise?.adresse || "Alger, Algérie"}</p>
                  <div className="grid grid-cols-[30px_1fr] gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="font-semibold">RC:</span> <span>{entreprise?.rc || "16/00-XXXXXXX"}</span>
                    <span className="font-semibold">NIF:</span> <span>{entreprise?.nif || "0019XXXXXXXXXX"}</span>
                    <span className="font-semibold">NIS:</span> <span>{entreprise?.nis || "0019XXXXXXXXXX"}</span>
                    <span className="font-semibold">Art:</span> <span>{entreprise?.art || "16XXXXXXXXX"}</span>
                    <span className="font-semibold">RIB:</span> <span>{entreprise?.rib || "0000 00 00 00 00"}</span>
                  </div>
                  <div className="absolute top-0 left-0 -mt-[1px] -ml-[1px] w-4 h-4 bg-white rounded-br-xl"></div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1.5 mb-6 whitespace-nowrap">
                    <img
                      src="/brand/solutionmaxi-icone.svg"
                      alt="Logo"
                      className="h-10 w-auto object-contain"
                    />
                    <div className="flex flex-col justify-center">
                      <h1 className="text-xl font-black uppercase text-brand-black leading-none">
                        {entreprise?.nom || "SOLUTION MAXI"}
                      </h1>
                      <p className="text-[10px] font-bold italic mt-0.5 tracking-tighter">Plus de temps à perdre !</p>
                    </div>
                  </div>

                  <div className="bg-[#e5e7eb] px-4 py-1.5 rounded-lg border border-[#d1d5db] text-xs font-bold w-fit">
                    Le : {dateFr(facture.date_emission)}
                  </div>
                </div>
              </div>

              {/* Titre facture */}
              <div className="text-center mb-6">
                <h2 className="text-lg font-black uppercase">
                  {facture.type_facture === "proforma" ? "Facture proforma" : "Facture"} n°: {facture.numero}
                </h2>
              </div>

              {/* Informations du client */}
              <div className="mb-6 w-full sm:w-[48%] border border-black rounded-xl p-3.5 text-xs leading-relaxed font-medium">
                <p className="mb-1.5"><span className="font-bold">Doit:</span> {facture.client_nom || "Client Particulier"}</p>
                {facture.client_tel && <p><span className="font-bold">Tél:</span> {facture.client_tel}</p>}
                {facture.client_adresse && <p><span className="font-bold">Adresse:</span> {facture.client_adresse}</p>}
                {facture.client_rc && <p><span className="font-bold">RC:</span> {facture.client_rc}</p>}
                {facture.client_nif && <p><span className="font-bold">NIF:</span> {facture.client_nif}</p>}
                {facture.client_ai && <p><span className="font-bold">AI:</span> {facture.client_ai}</p>}
                {facture.client_nis && <p><span className="font-bold">NIS:</span> {facture.client_nis}</p>}
              </div>

              {/* Tableau des articles */}
              <div className="mb-6 w-full overflow-x-auto">
                <table className="w-full min-w-[500px] border-collapse border border-black text-xs text-center">
                  <thead>
                    <tr className="bg-[#d1d5db]">
                      <th className="border border-black py-1.5 px-2 font-bold w-12">N°</th>
                      <th className="border border-black py-1.5 px-2 font-bold text-left">Désignation</th>
                      <th className="border border-black py-1.5 px-2 font-bold w-12">U</th>
                      <th className="border border-black py-1.5 px-2 font-bold w-16">Qté</th>
                      <th className="border border-black py-1.5 px-2 font-bold w-24">Prix U (HT)</th>
                      <th className="border border-black py-1.5 px-2 font-bold w-28">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const groupes = facture.lignes.reduce((acc, ligne) => {
                        const existant = acc.find((g) => g.designation === ligne.designation && g.prix === ligne.prix);
                        if (existant) {
                          existant.qtt += 1;
                        } else {
                          acc.push({ ...ligne, qtt: 1 });
                        }
                        return acc;
                      }, [] as (LigneFactureDto & { qtt: number })[]);

                      return groupes.map((g, idx) => (
                        <tr key={idx} className="border-b border-black">
                          <td className="border-r border-black py-2 px-2">{idx + 1}</td>
                          <td className="border-r border-black py-2 px-2 text-left font-medium">
                            <span className="font-mono font-bold mr-1 text-slate-800">[{g.code_interne}]</span>
                            <span>{g.designation}</span>
                          </td>
                          <td className="border-r border-black py-2 px-2">U</td>
                          <td className="border-r border-black py-2 px-2 font-bold">{g.qtt}</td>
                          <td className="border-r border-black py-2 px-2 font-mono">{formaterDA(g.prix)}</td>
                          <td className="border-r border-black py-2 px-2 font-bold font-mono">{formaterDA(g.prix * g.qtt)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Totaux & Arrêté de facture */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div className="w-full sm:w-1/2 p-3 bg-slate-50 border border-black rounded-xl text-xs space-y-1">
                  <div className="font-bold">Arrêtée la présente facture à la somme de :</div>
                  <div className="italic font-medium text-slate-800">{montantEnLettres(facture.total_net)} Dinars Algériens</div>
                  <div className="pt-2 text-[11px] text-slate-600">
                    Mode de règlement : <strong className="uppercase">{facture.mode_paiement || "Espèces"}</strong> · Garantie : <strong>{facture.garantie_mois} Mois</strong>
                  </div>
                </div>

                <div className="w-full sm:w-[40%] space-y-1 text-xs">
                  <div className="flex justify-between border-b border-black py-1">
                    <span>Total Brut HT :</span>
                    <span className="font-mono font-bold">{formaterDA(facture.total)}</span>
                  </div>
                  {facture.type_facture === "tva" && (
                    <div className="flex justify-between border-b border-black py-1">
                      <span>TVA (19%) :</span>
                      <span className="font-mono font-bold">{formaterDA(Math.round(facture.total * 0.19))}</span>
                    </div>
                  )}
                  <div className="flex justify-between bg-[#d1d5db] p-2 border border-black font-black text-sm">
                    <span>TOTAL TTC :</span>
                    <span className="font-mono">{formaterDA(facture.total_net)}</span>
                  </div>
                </div>
              </div>

              {/* Cachet & Signature */}
              <div className="flex justify-between items-end pt-4 border-t border-slate-300 text-xs">
                <div>
                  <div>Émis par : <strong>{facture.vendeur}</strong></div>
                  <div className="text-[10px] text-slate-500">Document généré automatiquement</div>
                </div>
                <div className="text-center pr-8">
                  <div className="font-bold mb-8">Cachet & Signature</div>
                  {entreprise?.cachet && (
                    <img src={entreprise.cachet} alt="Cachet" className="h-16 w-auto object-contain mx-auto" />
                  )}
                </div>
              </div>

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
