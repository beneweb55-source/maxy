"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { montantEnLettres } from "@/lib/nombres";
import {
  IconeFlecheGauche,
  IconeImprimante,
  IconeBouclier,
  IconeCrayon,
  IconeCorbeille,
} from "@/components/icons";
import GarantieCertificat from "@/components/factures/GarantieCertificat";

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

export default function FactureDetail({
  factureId,
  role,
}: {
  factureId: number;
  role: Role;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "ticket" || searchParams.get("print") === "auto";
  const { afficher } = useToast();
  const [facture, setFacture] = useState<FactureDto | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [editionClient, setEditionClient] = useState(false);
  const [formatTicket, setFormatTicket] = useState(autoPrint);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [typeFacture, setTypeFacture] = useState("normale");
  const [adresse, setAdresse] = useState("");
  const [rc, setRc] = useState("");
  const [nif, setNif] = useState("");
  const [ai, setAi] = useState("");
  const [nis, setNis] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [vueGarantie, setVueGarantie] = useState(false);

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
      setTypeFacture(f.type_facture ?? "normale");
      setAdresse(f.client_adresse ?? "");
      setRc(f.client_rc ?? "");
      setNif(f.client_nif ?? "");
      setAi(f.client_ai ?? "");
      setNis(f.client_nis ?? "");
      setErreur(null);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, [factureId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (facture && autoPrint) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [facture, autoPrint]);

  async function enregistrerClient() {
    setEnvoi(true);
    try {
      const res = await fetch(`/api/factures/${factureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          client_nom: nom, 
          client_tel: tel,
          type_facture: typeFacture,
          client_adresse: adresse,
          client_rc: rc,
          client_nif: nif,
          client_ai: ai,
          client_nis: nis,
        }),
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

  async function supprimerFacture() {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ? Cela annulera également les ventes et les mouvements de caisse associés.")) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/factures/${factureId}`, { method: "DELETE" });
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        afficher(corps?.error ?? "Erreur lors de la suppression.", "erreur");
        setEnvoi(false);
        return;
      }
      afficher("Facture supprimée et ventes annulées avec succès.");
      router.push("/factures");
      router.refresh();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
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

  if (vueGarantie) {
    return (
      <GarantieCertificat
        facture={facture}
        onRetour={() => setVueGarantie(false)}
      />
    );
  }

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
          <button
            type="button"
            onClick={() => setVueGarantie(true)}
            className="btn bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
          >
            <IconeBouclier taille={15} />
            Créer garantie
          </button>
          <button type="button" onClick={() => window.print()} className="btn btn-primaire">
            <IconeImprimante taille={15} />
            Imprimer
          </button>
          <div className="flex bg-brand-light-grey/20 rounded-lg p-1 ml-2">
            <button
              type="button"
              onClick={() => setFormatTicket(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${!formatTicket ? 'bg-white shadow-sm text-brand-black' : 'text-brand-warm-grey hover:text-brand-black'}`}
            >
              A4
            </button>
            <button
              type="button"
              onClick={() => setFormatTicket(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${formatTicket ? 'bg-white shadow-sm text-brand-black' : 'text-brand-warm-grey hover:text-brand-black'}`}
            >
              Ticket (80mm)
            </button>
          </div>
          {peutModifier && (
            <button
              type="button"
              disabled={envoi}
              onClick={() => void supprimerFacture()}
              className="btn bg-brand-red/10 text-brand-red hover:bg-brand-red/20"
            >
              <IconeCorbeille taille={15} />
              Supprimer
            </button>
          )}
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
            <div>
              <label className="libelle mb-1.5" htmlFor="client-type-facture">Type de facture</label>
              <select id="client-type-facture" value={typeFacture} onChange={e => setTypeFacture(e.target.value)} className="champ">
                <option value="normale">Normale</option>
                <option value="tva">Avec TVA (19%)</option>
                <option value="proforma">Proforma</option>
              </select>
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-adresse">Adresse</label>
              <input id="client-adresse" type="text" value={adresse} onChange={e => setAdresse(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-rc">RC</label>
              <input id="client-rc" type="text" value={rc} onChange={e => setRc(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-nif">NIF</label>
              <input id="client-nif" type="text" value={nif} onChange={e => setNif(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-nis">NIS</label>
              <input id="client-nis" type="text" value={nis} onChange={e => setNis(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-ai">Art. d&apos;Imposition</label>
              <input id="client-ai" type="text" value={ai} onChange={e => setAi(e.target.value)} className="champ" />
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
      {!formatTicket && (
        <div className="carte print:border-0 print:p-0 print:shadow-none print:m-0 print:bg-white text-black text-[13px] leading-tight">
        
        {/* En-tête : Info entreprise à gauche, Logo à droite */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="bg-[#e5e7eb] p-4 rounded-xl rounded-tl-none w-[45%] text-xs border border-[#d1d5db] relative">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-1.5">{facture.entreprise?.nom || "Solution Maxi"}</h2>
            <p className="mb-2 font-medium">{facture.entreprise?.adresse || "Alger, Algérie"}</p>
            <div className="grid grid-cols-[30px_1fr] gap-x-2 gap-y-0.5">
              <span className="font-semibold">RC:</span> <span>{facture.entreprise?.rc || "RC XXXXXXXXX"}</span>
              <span className="font-semibold">NIF:</span> <span>{facture.entreprise?.nif || "NIF XXXXXXXXX"}</span>
              <span className="font-semibold">NIS:</span> <span>{facture.entreprise?.nis || "NIS XXXXXXXXX"}</span>
              <span className="font-semibold">N Art:</span> <span>{facture.entreprise?.art || "ART XXXXXXXXX"}</span>
              <span className="font-semibold">RIB:</span> <span>{facture.entreprise?.rib || "0000 00 00 00 00"}</span>
            </div>
            {/* Petit coin stylisé en haut à gauche pour reproduire la forme de la capture (optionnel) */}
            <div className="absolute top-0 left-0 -mt-[1px] -ml-[1px] w-4 h-4 bg-white rounded-br-xl"></div>
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-8 whitespace-nowrap">
              <img
                src="/brand/solutionmaxi-icone.svg"
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-black uppercase text-brand-black leading-none">{facture.entreprise?.nom || "SOLUTION MAXI"}</h1>
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
          <h2 className="text-lg font-bold">
            {facture.type_facture === "proforma" ? "Facture proforma" : "Facture"} n°: {facture.numero}
          </h2>
        </div>

        {/* Informations du client */}
        <div className="mb-6 w-[45%] border border-black rounded-xl p-3 text-xs leading-relaxed font-medium">
          <p className="mb-2"><span className="font-bold">Doit</span> {facture.client_nom || "Particulier"}</p>
          <p><span className="font-bold">Adresse:</span> {facture.client_adresse || ""}</p>
          <p><span className="font-bold">RC:</span> {facture.client_rc || ""}</p>
          <p><span className="font-bold">NIF:</span> {facture.client_nif || ""}</p>
          <p><span className="font-bold">AI:</span> {facture.client_ai || ""}</p>
          <p><span className="font-bold">NIS:</span> {facture.client_nis || ""}</p>
        </div>

        {/* Tableau des articles */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-black text-xs text-center">
            <thead>
              <tr className="bg-[#d1d5db]">
                <th className="border border-black py-1.5 px-2 font-bold w-12">Art N°</th>
                <th className="border border-black py-1.5 px-2 font-bold text-left">Désignation</th>
                <th className="border border-black py-1.5 px-2 font-bold w-12">UM</th>
                <th className="border border-black py-1.5 px-2 font-bold w-16">QTT</th>
                <th className="border border-black py-1.5 px-2 font-bold w-24">Prix U HT</th>
                <th className="border border-black py-1.5 px-2 font-bold w-28">Montant HT</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const groupes = facture.lignes.reduce((acc, ligne) => {
                  if (ligne.annulee) return acc;
                  const existant = acc.find(g => g.designation === ligne.designation && g.prix === ligne.prix);
                  if (existant) {
                    existant.qtt += 1;
                  } else {
                    acc.push({ ...ligne, qtt: 1 });
                  }
                  return acc;
                }, [] as (LigneFactureDto & { qtt: number })[]);

                return (
                  <>
                    {groupes.map((l, idx) => (
                      <tr key={idx} className="h-8">
                        <td className="border border-black px-2">{idx + 1}</td>
                        <td className="border border-black px-2 text-left font-bold">{l.designation}</td>
                        <td className="border border-black px-2">U</td>
                        <td className="border border-black px-2">{l.qtt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                        <td className="border border-black px-2 text-right">{l.prix.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                        <td className="border border-black px-2 text-right">{(l.prix * l.qtt).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </>
                );
              })()}
            </tbody>
            <tfoot>
              {facture.type_facture === "tva" ? (
                <>
                  <tr className="font-bold">
                    <td colSpan={4} className="border-t border-black border-r border-r-transparent"></td>
                    <td className="border border-black px-2 py-1.5 text-right">TOTAL HT</td>
                    <td className="border border-black px-2 py-1.5 text-right bg-white">{facture.total_net.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={4} className="border-r border-transparent"></td>
                    <td className="border border-black px-2 py-1.5 text-right">TVA 19%</td>
                    <td className="border border-black px-2 py-1.5 text-right bg-white">{(facture.total_net * 0.19).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={4} className="border-r border-transparent"></td>
                    <td className="border border-black px-2 py-1.5 text-right">Droit Timbre 1%</td>
                    <td className="border border-black px-2 py-1.5 text-right bg-white">{Math.min(10000, facture.total_net * 1.19 * 0.01).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={4} className="border-r border-transparent"></td>
                    <td className="border border-black px-2 py-1.5 text-right">TOTAL TTC</td>
                    <td className="border border-black px-2 py-1.5 text-right bg-white">
                      {(facture.total_net * 1.19 + Math.min(10000, facture.total_net * 1.19 * 0.01)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </>
              ) : (
                <tr className="font-bold">
                  <td colSpan={4} className="border-t border-black border-r border-r-transparent"></td>
                  <td className="border border-black px-2 py-1.5 text-right">TOTAL HT</td>
                  <td className="border border-black px-2 py-1.5 text-right bg-white">{facture.total_net.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* Cachet et signature */}
        <div className="flex justify-end mr-12 mt-12 mb-16">
          <div className="relative w-64 h-32">
            {(facture.entreprise?.cachet || "/brand/cachet.png") && (
              <img 
                src={facture.entreprise?.cachet || "/brand/cachet.png"} 
                alt="Cachet" 
                className="absolute inset-0 w-full h-full object-contain opacity-90 mix-blend-multiply"
              />
            )}
          </div>
        </div>

        {/* Pied de page */}
        <div className="bg-[#e5e7eb] py-3 px-6 text-xs text-brand-black mt-20">
          <div className="text-center font-semibold mb-2 underline underline-offset-2">
            Pour toutes informations, n&apos;hésitez pas de nous contacter
          </div>
          <div className="flex justify-between font-bold">
            <div>
              <p>Mobile :</p>
              <p className="font-normal mt-0.5">{facture.entreprise?.tel || "0000 00 00 00"}</p>
            </div>
            <div>
              <p>Courriel :</p>
              <p className="font-normal mt-0.5">contact@{facture.entreprise?.nom?.toLowerCase().replace(/\s+/g, '') || "solutionmaxi"}.dz</p>
            </div>
            <div className="text-right">
              <p>Site :</p>
              <p className="font-normal mt-0.5">www.{facture.entreprise?.nom?.toLowerCase().replace(/\s+/g, '') || "solutionmaxi"}.dz</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {formatTicket && (
        <div className="carte print:border-0 print:p-0 print:shadow-none print:m-0 print:bg-white text-black text-xs leading-tight mx-auto max-w-[80mm] w-full">
          {/* En-tête Ticket */}
          <div className="text-center mb-4 border-b border-black border-dashed pb-4">
            <h1 className="text-lg font-black uppercase mb-1">{facture.entreprise?.nom || "SOLUTION MAXI"}</h1>
            <p className="font-semibold">{facture.entreprise?.tel || "0000 00 00 00"}</p>
            <p className="mb-2">{facture.entreprise?.adresse || "Alger, Algérie"}</p>
            <div className="grid grid-cols-2 text-[10px] text-left gap-x-2">
              <span>RC: {facture.entreprise?.rc || "RC XXXXXXXXX"}</span>
              <span>NIF: {facture.entreprise?.nif || "NIF XXXXXXXXX"}</span>
              <span>NIS: {facture.entreprise?.nis || "NIS XXXXXXXXX"}</span>
              <span>Art: {facture.entreprise?.art || "ART XXXXXXXXX"}</span>
            </div>
          </div>

          <div className="mb-4 text-center">
            <h2 className="font-bold text-sm">TICKET DE CAISSE</h2>
            <p className="font-bold">N° {facture.numero}</p>
            <p>Le : {dateFr(facture.date_emission)}</p>
          </div>

          {/* Informations du client (si renseignées) */}
          {facture.client_nom && (
            <div className="mb-4 border-b border-black border-dashed pb-4">
              <p><span className="font-bold">Client:</span> {facture.client_nom}</p>
              {facture.client_tel && <p><span className="font-bold">Tel:</span> {facture.client_tel}</p>}
            </div>
          )}

          {/* Lignes du ticket */}
          <table className="w-full text-left mb-4">
            <thead>
              <tr className="border-b border-black border-dashed">
                <th className="py-1">QTE</th>
                <th className="py-1">ARTICLE</th>
                <th className="py-1 text-right">MONTANT</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const groupes = facture.lignes.reduce((acc, ligne) => {
                  if (ligne.annulee) return acc;
                  const existant = acc.find(g => g.designation === ligne.designation && g.prix === ligne.prix);
                  if (existant) {
                    existant.qtt += 1;
                  } else {
                    acc.push({ ...ligne, qtt: 1 });
                  }
                  return acc;
                }, [] as (LigneFactureDto & { qtt: number })[]);

                return groupes.map((l, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 align-top font-bold">{l.qtt}x</td>
                    <td className="py-1.5 pr-2 leading-snug">{l.designation}</td>
                    <td className="py-1.5 align-top text-right font-bold">{(l.prix * l.qtt).toLocaleString("fr-FR")}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>

          {/* Total Ticket */}
          <div className="border-t border-black border-dashed pt-2 mb-6">
            {facture.type_facture === "tva" ? (
              <>
                <div className="flex justify-between font-bold mb-1">
                  <span>TOTAL HT</span>
                  <span>{facture.total_net.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>TVA (19%)</span>
                  <span>{(facture.total_net * 0.19).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Timbre</span>
                  <span>{Math.min(10000, facture.total_net * 1.19 * 0.01).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA</span>
                </div>
                <div className="flex justify-between font-black text-base mt-2 border-t border-black pt-2">
                  <span>TOTAL TTC</span>
                  <span>
                    {(facture.total_net * 1.19 + Math.min(10000, facture.total_net * 1.19 * 0.01)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-black text-base">
                <span>TOTAL A PAYER</span>
                <span>{facture.total_net.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA</span>
              </div>
            )}
          </div>

          <div className="text-center font-bold text-[10px]">
            <p className="mb-1">MERCI DE VOTRE VISITE</p>
            <p>www.{facture.entreprise?.nom?.toLowerCase().replace(/\s+/g, '') || "solutionmaxi"}.dz</p>
          </div>
        </div>
      )}
    </div>
  );
}
