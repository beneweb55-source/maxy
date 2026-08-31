"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle, 
  RotateCcw, 
  ShieldCheck, 
  Receipt,
  User,
  Building2,
  Calendar,
  CreditCard,
  X,
  Edit3
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";

interface FicheCommandeProps {
  commandeId: number;
}

export default function FicheCommande({ commandeId }: FicheCommandeProps) {
  const { afficher } = useToast();
  const [commande, setCommande] = useState<any>(null);
  const [chargement, setChargement] = useState(true);

  // Modale Statut / Remboursement
  const [modalAction, setModalAction] = useState<"statut" | "remboursement" | null>(null);
  const [nouveauStatut, setNouveauStatut] = useState<string>("");
  const [envoiAction, setEnvoiAction] = useState(false);

  const chargerDetails = async () => {
    setChargement(true);
    try {
      const res = await fetch(`/api/commandes/${commandeId}`);
      if (!res.ok) throw new Error("Commande introuvable");
      const data = await res.json();
      setCommande(data);
      setNouveauStatut(data.statut);
    } catch (err: any) {
      afficher(err.message || "Erreur chargement.", "erreur");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDetails();
  }, [commandeId]);

  const executerChangementStatut = async (statutCible: string) => {
    setEnvoiAction(true);
    try {
      const res = await fetch(`/api/commandes/${commandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: statutCible }),
      });

      if (!res.ok) throw new Error("Erreur mise à jour");
      const updated = await res.json();
      setCommande(updated);
      setModalAction(null);
      afficher(`Statut mis à jour : ${statutCible}`, "succes");
    } catch (err: any) {
      afficher(err.message || "Erreur action.", "erreur");
    } finally {
      setEnvoiAction(false);
    }
  };

  const lancerImpression = () => {
    window.print();
  };

  if (chargement) {
    return <div className="p-8 text-center text-slate-400 font-bold">Chargement du document...</div>;
  }

  if (!commande) {
    return <div className="p-8 text-center text-red-500 font-bold">Document introuvable.</div>;
  }

  const nomClient = commande.client?.nom || commande.client_nom || "Client Comptoir";

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto font-sans space-y-6">
      
      {/* Barre d'Actions Supérieure (Masquée à l'impression) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <Link
          href="/commandes"
          className="btn btn-secondaire text-xs h-11 px-4 rounded-xl font-bold flex items-center gap-2 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux Commandes</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setModalAction("statut")}
            className="btn btn-secondaire text-xs h-11 px-4 rounded-xl font-bold flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4 text-brand-orange" />
            <span>Modifier Statut</span>
          </button>

          {commande.statut === "payee" && (
            <button
              type="button"
              onClick={() => setModalAction("remboursement")}
              className="btn btn-secondaire text-xs h-11 px-4 rounded-xl font-bold text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-50 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rembourser</span>
            </button>
          )}

          <button
            type="button"
            onClick={lancerImpression}
            className="btn btn-primaire text-xs h-11 px-5 rounded-xl font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer Facture A4</span>
          </button>
        </div>
      </div>

      {/* ======================= DOCUMENT FACTURE A4 ======================= */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-md print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        
        {/* En-tête de la Facture */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b-2 border-slate-900">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 uppercase font-outfit">
              Solution Maxi IT
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Matériel Informatique & Équipement Professionnel POS<br />
              Alger, Algérie • Tél: +213 (0) 550 00 00 00
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-black uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-3 py-1 rounded-full inline-block mb-2">
              {commande.statut === "devis" ? "DEVIS PROFORMA" : "FACTURE DE VENTE"}
            </span>
            <div className="text-xl font-black font-mono text-slate-900">
              N° {commande.numero}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              Date : {new Date(commande.date_commande).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Bloc Informations Client & Vente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-200 text-xs">
          
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Facturé à :
            </span>
            <div className="text-sm font-black text-slate-900">{nomClient}</div>
            {commande.client_tel && <div>Tél : {commande.client_tel}</div>}
            {commande.client_adresse && <div>Adresse : {commande.client_adresse}</div>}
            {commande.client?.registre_commerce && <div>RC : {commande.client.registre_commerce}</div>}
            {commande.client?.nif && <div>NIF : {commande.client.nif}</div>}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Modalités & Garantie :
            </span>
            <div className="flex justify-between">
              <span className="text-slate-500">Mode de Paiement :</span>
              <span className="font-bold uppercase text-slate-900">{commande.type_paiement}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Garantie Pièces & Main d'Œuvre :</span>
              <span className="font-bold text-slate-900">{commande.garantie_mois} Mois</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fin de Garantie :</span>
              <span className="font-bold text-slate-900">
                {new Date(commande.garantie_fin).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>

        </div>

        {/* Tableau des Articles avec Numéros de Série (S/N) */}
        <div className="py-6 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-2">#</th>
                <th className="py-3 px-2">Désignation & Numéro de Série (S/N)</th>
                <th className="py-3 px-2 text-center">Qté</th>
                <th className="py-3 px-2 text-right">Prix Unitaire</th>
                <th className="py-3 px-2 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {commande.lignes?.map((l: any, index: number) => (
                <tr key={l.id} className="py-3">
                  <td className="py-3.5 px-2 font-mono text-slate-400">{index + 1}</td>
                  <td className="py-3.5 px-2">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">
                      {l.designation}
                    </div>
                    {/* Numéro de Série Indispensable pour la Garantie IT */}
                    {l.numero_serie && (
                      <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>S/N : {l.numero_serie}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-center font-bold font-mono">{l.quantite}</td>
                  <td className="py-3.5 px-2 text-right font-mono font-bold text-slate-800">
                    {formaterDA(l.prix_unitaire)}
                  </td>
                  <td className="py-3.5 px-2 text-right font-mono font-black text-slate-900">
                    {formaterDA(l.total_ligne)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux & Signature */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t-2 border-slate-900">
          
          <div className="space-y-4">
            {commande.notes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold block text-slate-500 mb-1">Notes :</span>
                <p className="text-slate-700">{commande.notes}</p>
              </div>
            )}
            <div className="text-[11px] text-slate-400">
              * Les matériels vendus bénéficient de la garantie contractuelle mentionnée ci-dessus. Tout numéro de série détérioré ou retiré annule la garantie.
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Total Brut HT :</span>
              <span className="font-mono font-bold text-slate-900">{formaterDA(commande.total_ht)}</span>
            </div>
            {commande.remise_globale > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-red-600">
                <span>Remise Commerciale :</span>
                <span className="font-mono font-bold">-{formaterDA(commande.remise_globale)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 items-baseline">
              <span className="text-sm font-black uppercase text-slate-900">Total Net TTC :</span>
              <span className="text-2xl font-black font-mono text-slate-900">{formaterDA(commande.total_ttc)}</span>
            </div>
          </div>

        </div>

      </div>

      {/* ======================= MODALE D'ACTION ======================= */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-entree print:hidden">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {modalAction === "remboursement" ? "Confirmer le Remboursement" : "Modifier le Statut"}
              </h3>
              <button onClick={() => setModalAction(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalAction === "remboursement" ? (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Cette action passera la commande en <strong>Remboursée</strong> et remettra <strong>automatiquement en stock</strong> tous les exemplaires physiques vendus.
                </p>
                <button
                  type="button"
                  disabled={envoiAction}
                  onClick={() => executerChangementStatut("remboursee")}
                  className="w-full h-12 rounded-xl bg-red-600 text-white font-black text-xs uppercase"
                >
                  Confirmer le Remboursement & Remise en Stock
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  {["payee", "en_attente", "devis", "annulee"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => executerChangementStatut(st)}
                      className={`p-3 rounded-xl border font-bold uppercase ${
                        commande.statut === st ? "border-brand-orange bg-brand-orange/10 text-brand-orange" : "border-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Style d'Impression Print CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          nav, header, aside, .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>

    </div>
  );
}
