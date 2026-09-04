"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formaterDA } from "@/lib/caisse";
import { montantEnLettres } from "@/lib/nombres";
import {
  IconeImprimante,
  IconeFlecheGauche,
} from "@/components/icons";

interface LigneCommandeDto {
  id: number;
  produit_id: number | null;
  code_interne: string;
  designation: string;
  numero_serie: string | null;
  categorie: string | null;
  prix_unitaire: number;
  quantite: number;
  total_ligne: number;
}

interface CommandeDto {
  id: number;
  numero: string;
  date_commande: string;
  statut: string;
  type_paiement: string;
  client_nom: string | null;
  client_tel: string | null;
  client_adresse: string | null;
  total_ht: number;
  total_ttc: number;
  total_tva: number;
  remise_globale: number;
  garantie_mois: number;
  notes: string | null;
  client?: {
    nom: string;
    telephone: string | null;
    adresse: string | null;
    registre_commerce?: string | null;
    nif?: string | null;
    article_imposition?: string | null;
    nis?: string | null;
  } | null;
  vendeur?: {
    username: string;
  } | null;
  lignes: LigneCommandeDto[];
}

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ImpressionMasseCommandes() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsString = searchParams.get("ids") || "";
  const autoPrint = searchParams.get("auto") === "1";

  const [commandes, setCommandes] = useState<CommandeDto[]>([]);
  const [entreprise, setEntreprise] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [formatTicket, setFormatTicket] = useState(false);

  const chargerCommandes = useCallback(async () => {
    if (!idsString.trim()) {
      setErreur("Aucun identifiant de commande spécifié pour l'impression.");
      setChargement(false);
      return;
    }

    try {
      const res = await fetch(`/api/commandes?ids=${encodeURIComponent(idsString)}`);
      if (!res.ok) {
        throw new Error("Erreur lors de la récupération des commandes.");
      }
      const data = await res.json();
      setCommandes(data.commandes || []);
      setEntreprise(data.entreprise || null);
    } catch (err: any) {
      setErreur(err.message || "Erreur réseau.");
    } finally {
      setChargement(false);
    }
  }, [idsString]);

  useEffect(() => {
    void chargerCommandes();
  }, [chargerCommandes]);

  useEffect(() => {
    if (!chargement && commandes.length > 0 && autoPrint) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [chargement, commandes.length, autoPrint]);

  if (chargement) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold">
        Chargement des factures de commandes en lot...
      </div>
    );
  }

  if (erreur || commandes.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-4">
        <div className="text-red-500 font-black text-lg">Impression Impossible</div>
        <p className="text-slate-600 text-sm">{erreur || "Aucune commande trouvée."}</p>
        <Link href="/commandes" className="btn btn-secondaire text-xs">
          Retour aux Commandes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-paper p-4 sm:p-8 force-light-mode text-brand-black">
      
      {/* Barre d'outils (masquée à l'impression) */}
      <div className="print:hidden max-w-4xl mx-auto mb-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/commandes"
            className="btn btn-secondaire text-xs h-10 px-3 rounded-xl font-bold flex items-center gap-1.5"
          >
            <IconeFlecheGauche taille={14} />
            <span>Commandes</span>
          </Link>
          <div className="text-xs font-bold text-slate-600">
            Lot de <strong className="text-slate-900">{commandes.length}</strong> facture(s)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFormatTicket(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                !formatTicket ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              A4 Standard
            </button>
            <button
              type="button"
              onClick={() => setFormatTicket(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                formatTicket ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Ticket (80mm)
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primaire text-xs h-10 px-5 rounded-xl font-black flex items-center gap-2 shadow-md shadow-brand-orange/20"
          >
            <IconeImprimante taille={15} />
            <span>Imprimer tout le lot</span>
          </button>
        </div>
      </div>

      {/* Conteneur des Factures */}
      <div className="max-w-4xl mx-auto space-y-12 print:space-y-0 print:m-0 print:p-0 print:max-w-none">
        {commandes.map((cmd, index) => {
          const estDerniere = index === commandes.length - 1;
          const nomClient = cmd.client?.nom || cmd.client_nom || "Particulier";
          const telClient = cmd.client?.telephone || cmd.client_tel || "";
          const adrClient = cmd.client?.adresse || cmd.client_adresse || "";
          const rcClient = cmd.client?.registre_commerce || "";
          const nifClient = cmd.client?.nif || "";
          const aiClient = cmd.client?.article_imposition || "";
          const nisClient = cmd.client?.nis || "";

          if (formatTicket) {
            return (
              <div
                key={cmd.id}
                className={`facture-feuille carte print:border-0 print:p-0 print:shadow-none print:m-0 print:bg-white text-black text-xs leading-tight mx-auto max-w-[80mm] w-full p-4 mb-8 bg-white ${
                  !estDerniere ? "page-break-after-always" : ""
                }`}
              >
                <div className="text-center mb-4 border-b border-black border-dashed pb-4">
                  <h1 className="text-lg font-black uppercase mb-1">{entreprise?.nom || "SOLUTION MAXI"}</h1>
                  <p className="font-semibold">{entreprise?.tel || "0000 00 00 00"}</p>
                  <p className="mb-2">{entreprise?.adresse || "Alger, Algérie"}</p>
                  <div className="grid grid-cols-2 text-[10px] text-left gap-x-2">
                    <span>RC: {entreprise?.rc || "RC XXXXXXXXX"}</span>
                    <span>NIF: {entreprise?.nif || "NIF XXXXXXXXX"}</span>
                    <span>NIS: {entreprise?.nis || "NIS XXXXXXXXX"}</span>
                    <span>Art: {entreprise?.art || "ART XXXXXXXXX"}</span>
                  </div>
                </div>

                <div className="mb-4 text-center">
                  <h2 className="font-bold text-sm">Ticket de Caisse</h2>
                  <p className="font-bold">N° {cmd.numero}</p>
                  <p>Le : {dateFr(cmd.date_commande)}</p>
                </div>

                {nomClient && nomClient !== "Particulier" && (
                  <div className="mb-4 border-b border-black border-dashed pb-4">
                    <p><span className="font-bold">Client:</span> {nomClient}</p>
                    {telClient && <p><span className="font-bold">Tel:</span> {telClient}</p>}
                  </div>
                )}

                <table className="w-full text-left mb-4">
                  <thead>
                    <tr className="border-b border-black border-dashed">
                      <th className="py-1">Art.</th>
                      <th className="py-1 text-center">Qté</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black divide-dashed">
                    {cmd.lignes?.map((l, idx) => (
                      <tr key={l.id || idx}>
                        <td className="py-1 pr-1">
                          <div className="font-bold">{l.code_interne}</div>
                          <div className="text-[10px] text-slate-700">{l.designation}</div>
                        </td>
                        <td className="py-1 text-center">{l.quantite}</td>
                        <td className="py-1 text-right font-mono font-bold">{formaterDA(l.total_ligne)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-black border-dashed pt-2 mb-4 space-y-1">
                  <div className="flex justify-between font-black text-sm">
                    <span>TOTAL TTC :</span>
                    <span>{formaterDA(cmd.total_ttc)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Règlement :</span>
                    <span className="uppercase">{cmd.type_paiement || "Espèces"}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Garantie :</span>
                    <span>{cmd.garantie_mois} Mois</span>
                  </div>
                </div>

                <div className="text-center text-[10px] pt-4 border-t border-black">
                  <p className="font-bold">Merci de votre confiance !</p>
                  <p className="italic">Conservez ce ticket pour la garantie.</p>
                </div>
              </div>
            );
          }

          // Format A4 Standard (Exactement identique à FactureDetail.tsx)
          return (
            <div
              key={cmd.id}
              className={`facture-feuille carte print:border-0 print:p-0 print:shadow-none print:m-0 print:bg-white text-black text-[13px] leading-tight bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl ${
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
                  <div className="grid grid-cols-[30px_1fr] gap-x-2 gap-y-0.5">
                    <span className="font-semibold">RC:</span> <span>{entreprise?.rc || "RC XXXXXXXXX"}</span>
                    <span className="font-semibold">NIF:</span> <span>{entreprise?.nif || "NIF XXXXXXXXX"}</span>
                    <span className="font-semibold">NIS:</span> <span>{entreprise?.nis || "NIS XXXXXXXXX"}</span>
                    <span className="font-semibold">ART:</span> <span>{entreprise?.art || "ART XXXXXXXXX"}</span>
                    <span className="font-semibold">RIB:</span> <span>{entreprise?.rib || "0000 00 00 00 00"}</span>
                  </div>
                  <div className="absolute top-0 left-0 -mt-[1px] -ml-[1px] w-4 h-4 bg-white rounded-br-xl"></div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1.5 mb-8 whitespace-nowrap">
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
                    Le : {dateFr(cmd.date_commande)}
                  </div>
                </div>
              </div>

              {/* Titre facture */}
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold">
                  {cmd.statut === "devis" ? "Facture proforma" : "Facture"} n°: {cmd.numero}
                </h2>
              </div>

              {/* Informations du client */}
              <div className="mb-6 w-full sm:w-[45%] border border-black rounded-xl p-3 text-xs leading-relaxed font-medium">
                <p className="mb-2"><span className="font-bold">Doit:</span> {nomClient}</p>
                {adrClient && <p><span className="font-bold">Adresse:</span> {adrClient}</p>}
                {rcClient && <p><span className="font-bold">RC:</span> {rcClient}</p>}
                {nifClient && <p><span className="font-bold">NIF:</span> {nifClient}</p>}
                {aiClient && <p><span className="font-bold">AI:</span> {aiClient}</p>}
                {nisClient && <p><span className="font-bold">NIS:</span> {nisClient}</p>}
                {telClient && <p><span className="font-bold">Tél:</span> {telClient}</p>}
              </div>

              {/* Tableau des articles */}
              <div className="mb-6 w-full overflow-x-auto">
                <table className="w-full min-w-[500px] border-collapse border border-black text-xs text-center">
                  <thead>
                    <tr className="bg-[#d1d5db]">
                      <th className="border border-black py-1.5 px-2 font-bold w-12">Art N°</th>
                      <th className="border border-black py-1.5 px-2 font-bold text-left">Désignation</th>
                      <th className="border border-black py-1.5 px-2 font-bold w-12">UM</th>
                      <th className="border border-black py-1.5 px-2 font-bold w-16">Qtt</th>
                      <th className="border border-black py-1.5 px-2 font-bold w-24">Prix UHT</th>
                      <th className="border border-black py-1.5 px-2 font-bold w-28">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmd.lignes?.map((l, idx) => (
                      <tr key={l.id || idx} className="h-8">
                        <td className="border border-black px-2">{idx + 1}</td>
                        <td className="border border-black px-2 text-left font-bold">
                          <span>{l.designation}</span>
                          {l.numero_serie && <span className="block text-[10px] font-mono text-slate-600 font-normal">S/N: {l.numero_serie}</span>}
                        </td>
                        <td className="border border-black px-2">U</td>
                        <td className="border border-black px-2">{Number(l.quantite).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                        <td className="border border-black px-2 text-right">{Number(l.prix_unitaire).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                        <td className="border border-black px-2 text-right">{(Number(l.prix_unitaire) * Number(l.quantite)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {cmd.total_tva > 0 ? (
                      <>
                        <tr className="font-bold">
                          <td colSpan={4} className="border-t border-black border-r border-r-transparent"></td>
                          <td className="border border-black px-2 py-1.5 text-right">Total HT</td>
                          <td className="border border-black px-2 py-1.5 text-right bg-white">{cmd.total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="font-bold">
                          <td colSpan={4} className="border-r border-transparent"></td>
                          <td className="border border-black px-2 py-1.5 text-right">TVA 19%</td>
                          <td className="border border-black px-2 py-1.5 text-right bg-white">{cmd.total_tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="font-bold">
                          <td colSpan={4} className="border-r border-transparent"></td>
                          <td className="border border-black px-2 py-1.5 text-right">Total TTC</td>
                          <td className="border border-black px-2 py-1.5 text-right bg-white">
                            {cmd.total_ttc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr className="font-bold">
                        <td colSpan={4} className="border-t border-black border-r border-r-transparent"></td>
                        <td className="border border-black px-2 py-1.5 text-right">Total HT</td>
                        <td className="border border-black px-2 py-1.5 text-right bg-white">{cmd.total_ttc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Arrêté de facture */}
              <div className="p-3 bg-slate-50 border border-black rounded-xl text-xs space-y-1 mb-8">
                <div className="font-bold">Arrêtée la présente facture à la somme de :</div>
                <div className="italic font-medium text-slate-800">{montantEnLettres(cmd.total_ttc)}</div>
                <div className="pt-1 text-[11px] text-slate-600">
                  Mode de règlement : <strong className="uppercase">{cmd.type_paiement || "Espèces"}</strong> · Garantie : <strong>{cmd.garantie_mois} Mois</strong>
                </div>
              </div>

              {/* Cachet et signature */}
              <div className="flex justify-end mr-12 mt-8 mb-16">
                <div className="relative w-64 h-32">
                  <img 
                    src={entreprise?.cachet || "/brand/cachet.png"} 
                    alt="Cachet" 
                    className="absolute inset-0 w-full h-full object-contain opacity-90 mix-blend-multiply"
                  />
                </div>
              </div>

              {/* Pied de page */}
              <div className="bg-[#e5e7eb] py-3 px-6 text-xs text-brand-black mt-16">
                <div className="text-center font-semibold mb-2 underline underline-offset-2">
                  Pour toutes informations, n&apos;hésitez pas de nous contacter
                </div>
                <div className="flex justify-between font-bold">
                  <div>
                    <p>Mobile :</p>
                    <p className="font-normal mt-0.5">{entreprise?.tel || "0000 00 00 00"}</p>
                  </div>
                  <div>
                    <p>Courriel :</p>
                    <p className="font-normal mt-0.5">contact@{entreprise?.nom?.toLowerCase().replace(/\s+/g, '') || "solutionmaxi"}.dz</p>
                  </div>
                  <div className="text-right">
                    <p>Site :</p>
                    <p className="font-normal mt-0.5">www.{entreprise?.nom?.toLowerCase().replace(/\s+/g, '') || "solutionmaxi"}.dz</p>
                  </div>
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
