"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Printer, 
  ArrowLeft, 
  RotateCcw, 
  X, 
  Edit3, 
  Trash2,
  Download,
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";
import { montantEnLettres } from "@/lib/nombres";
import { useToast } from "@/components/toast";

interface FicheCommandeProps {
  commandeId: number;
}

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function FicheCommande({ commandeId }: FicheCommandeProps) {
  const router = useRouter();
  const { afficher } = useToast();
  const [commande, setCommande] = useState<any>(null);
  const [entreprise, setEntreprise] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [formatTicket, setFormatTicket] = useState(false);

  // Modale Statut / Remboursement / Suppression
  const [modalAction, setModalAction] = useState<"statut" | "remboursement" | "suppression" | null>(null);
  const [envoiAction, setEnvoiAction] = useState(false);

  const chargerDetails = async () => {
    setChargement(true);
    try {
      const res = await fetch(`/api/commandes/${commandeId}`);
      if (!res.ok) throw new Error("Commande introuvable");
      const data = await res.json();
      setCommande(data);

      const paramsRes = await fetch(`/api/parametres`);
      if (paramsRes.ok) {
        const p = await paramsRes.json();
        setEntreprise({
          nom: p.entreprise_nom || "SOLUTION MAXI",
          adresse: p.entreprise_adresse || "Alger, Algérie",
          tel: p.entreprise_tel || "0000 00 00 00",
          rc: p.entreprise_rc || "RC XXXXXXXXX",
          nif: p.entreprise_nif || "NIF XXXXXXXXX",
          nis: p.entreprise_nis || "NIS XXXXXXXXX",
          art: p.entreprise_art || "ART XXXXXXXXX",
          rib: p.entreprise_rib || "0000 00 00 00 00",
          cachet: p.entreprise_cachet || "/brand/cachet.png",
        });
      }
    } catch (err: any) {
      afficher(err.message || "Erreur chargement.", "erreur");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDetails();
  }, [commandeId]);

  useEffect(() => {
    if (modalAction) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [modalAction]);

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

  const executerSuppression = async () => {
    setEnvoiAction(true);
    try {
      const res = await fetch(`/api/commandes/${commandeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const corps = await res.json().catch(() => null);
        throw new Error(corps?.error || "Erreur lors de la suppression.");
      }

      afficher("Commande supprimée avec succès et stock réajusté.", "succes");
      router.push("/commandes");
    } catch (err: any) {
      afficher(err.message || "Erreur suppression.", "erreur");
    } finally {
      setEnvoiAction(false);
    }
  };

  if (chargement) {
    return <div className="p-8 text-center text-slate-400 font-bold">Chargement du document...</div>;
  }

  if (!commande) {
    return <div className="p-8 text-center text-red-500 font-bold">Document introuvable.</div>;
  }

  const nomClient = commande.client?.nom || commande.client_nom || "Particulier";
  const telClient = commande.client?.telephone || commande.client_tel || "";
  const adrClient = commande.client?.adresse || commande.client_adresse || "";
  const rcClient = commande.client?.registre_commerce || "";
  const nifClient = commande.client?.nif || "";
  const aiClient = commande.client?.article_imposition || "";
  const nisClient = commande.client?.nis || "";

  return (
    <div className="mx-auto max-w-3xl w-full space-y-6 animate-entree print:max-w-none print:animate-none force-light-mode bg-brand-paper text-brand-black min-h-[100dvh] p-4 sm:p-6 rounded-2xl">
      
      {/* Barre d'Actions Supérieure (Masquée à l'impression) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <Link
          href="/commandes"
          className="lien inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Commandes</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setModalAction("statut")}
            className="btn btn-secondaire"
          >
            <Edit3 className="w-4 h-4 text-brand-orange" />
            <span>Modifier Statut</span>
          </button>

          {commande.statut === "payee" && (
            <button
              type="button"
              onClick={() => setModalAction("remboursement")}
              className="btn bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rembourser</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              window.print();
            }}
            className="btn bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/25 font-bold cursor-pointer"
            title="Imprimer la commande"
          >
            <Download className="w-4 h-4" />
            <span>Imprimer (PDF)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primaire"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>

          {/* Toggle Format A4 / Ticket */}
          <div className="flex bg-brand-light-grey/20 rounded-lg p-1 ml-2">
            <button
              type="button"
              onClick={() => setFormatTicket(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                !formatTicket ? "bg-white shadow-sm text-brand-black" : "text-brand-warm-grey hover:text-brand-black"
              }`}
            >
              A4
            </button>
            <button
              type="button"
              onClick={() => setFormatTicket(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                formatTicket ? "bg-white shadow-sm text-brand-black" : "text-brand-warm-grey hover:text-brand-black"
              }`}
            >
              Ticket (80mm)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setModalAction("suppression")}
            className="btn bg-brand-red/10 text-brand-red hover:bg-brand-red/20"
            title="Supprimer la commande"
          >
            <Trash2 className="w-4 h-4" />
            <span>Supprimer</span>
          </button>
        </div>
      </div>

      {/* Alerte si annulée */}
      {(commande.statut === "annulee" || commande.statut === "remboursee") && (
        <div className="alerte-erreur print:border print:border-danger" role="alert">
          Commande {commande.statut === "remboursee" ? "remboursée" : "annulée"} — les matériels ont été réintégrés en stock.
        </div>
      )}

      {/* ======================= FORMAT A4 STANDARD WYSIWYG 1:1 ======================= */}
      {!formatTicket && (
        <div 
          id="commande-print-area"
          className="carte w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 print:border-0 print:p-0 print:shadow-none print:m-0 print:bg-white text-black text-[13px] leading-tight shadow-md border border-slate-200"
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
                  crossOrigin="anonymous"
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
                Le : {dateFr(commande.date_commande)}
              </div>
            </div>
          </div>

          {/* Titre facture et Mention Contextuelle */}
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold">
              {commande.statut === "EN_ATTENTE" ? "Bon de Commande / Devis" : "Facture"} n°: {commande.numero}
            </h2>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-slate-300 bg-[#f3f4f6] text-slate-800">
                {commande.canal === "YALIDINE"
                  ? "Commande Yalidine — Expédition & Recouvrement"
                  : commande.canal && commande.canal !== "COMPTOIR"
                    ? `Commande ${commande.canal} — Expédition Yalidine`
                    : "Vente au Comptoir — Paiement immédiat"}
              </span>
            </div>
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
                {commande.lignes?.map((l: any, idx: number) => (
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
                {commande.total_tva > 0 ? (
                  <>
                    <tr className="font-bold">
                      <td colSpan={4} className="border-t border-black border-r border-r-transparent"></td>
                      <td className="border border-black px-2 py-1.5 text-right">Total HT</td>
                      <td className="border border-black px-2 py-1.5 text-right bg-white">{commande.total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="font-bold">
                      <td colSpan={4} className="border-r border-transparent"></td>
                      <td className="border border-black px-2 py-1.5 text-right">TVA 19%</td>
                      <td className="border border-black px-2 py-1.5 text-right bg-white">{commande.total_tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="font-bold">
                      <td colSpan={4} className="border-r border-transparent"></td>
                      <td className="border border-black px-2 py-1.5 text-right">Total TTC</td>
                      <td className="border border-black px-2 py-1.5 text-right bg-white">
                        {commande.total_ttc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr className="font-bold">
                    <td colSpan={4} className="border-t border-black border-r border-r-transparent"></td>
                    <td className="border border-black px-2 py-1.5 text-right">Total HT</td>
                    <td className="border border-black px-2 py-1.5 text-right bg-white">{commande.total_ttc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Arrêté de facture */}
          <div className="p-3 bg-slate-50 border border-black rounded-xl text-xs space-y-1 mb-8">
            <div className="font-bold">Arrêtée la présente facture à la somme de :</div>
            <div className="italic font-medium text-slate-800">{montantEnLettres(commande.total_ttc)}</div>
            <div className="pt-1 text-[11px] text-slate-600">
              Mode de règlement : <strong className="uppercase">{commande.type_paiement || "Espèces"}</strong> · Garantie : <strong>{commande.garantie_mois} Mois</strong>
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
      )}

      {/* ======================= FORMAT TICKET 80mm (IDENTIQUE À FACTUREDETAIL.TSX) ======================= */}
      {formatTicket && (
        <div className="carte print:border-0 print:p-0 print:shadow-none print:m-0 print:bg-white text-black text-xs leading-tight mx-auto max-w-[80mm] w-full">
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
            <p className="font-bold">N° {commande.numero}</p>
            <p>Le : {dateFr(commande.date_commande)}</p>
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
              {commande.lignes?.map((l: any, idx: number) => (
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
              <span>{formaterDA(commande.total_ttc)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Règlement :</span>
              <span className="uppercase">{commande.type_paiement}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Garantie :</span>
              <span>{commande.garantie_mois} Mois</span>
            </div>
          </div>

          <div className="text-center text-[10px] pt-4 border-t border-black">
            <p className="font-bold">Merci de votre confiance !</p>
            <p className="italic">Conservez ce ticket pour la garantie.</p>
          </div>
        </div>
      )}

      {/* ======================= MODALES D'ACTIONS ======================= */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/20 backdrop-blur-sm animate-entree print:hidden">
          <div className="w-full max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {modalAction === "remboursement" 
                  ? "Confirmer le Remboursement" 
                  : modalAction === "suppression" 
                    ? "Supprimer la Commande" 
                    : "Modifier le Statut"}
              </h3>
              <button onClick={() => setModalAction(null)} className="h-10 w-10 flex items-center justify-center rounded-xl p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalAction === "suppression" ? (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Êtes-vous sûr de vouloir supprimer définitivement la commande <strong>{commande.numero}</strong> ?
                  <br />
                  <span className="text-danger font-bold mt-1 block">
                    Les exemplaires matériels associés seront automatiquement réintégrés en stock (statut &quot;En vente&quot;).
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAction(null)}
                    className="btn btn-secondaire flex-1"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={envoiAction}
                    onClick={executerSuppression}
                    className="btn bg-danger text-white hover:bg-danger/90 flex-1 font-bold"
                  >
                    {envoiAction ? "Suppression..." : "Confirmer la Suppression"}
                  </button>
                </div>
              </div>
            ) : modalAction === "remboursement" ? (
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

    </div>
  );
}
