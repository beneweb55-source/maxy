"use client";

import { useCallback, useEffect, useState, useRef } from "react";
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
import { useLangue } from "@/lib/i18n/contexte";
import { useConfirmation } from "@/hooks/useConfirmation";
import ConfirmerAction from "@/components/ConfirmerAction";
import GarantieCertificat from "@/components/factures/GarantieCertificat";
import { naviguerRetourInterne } from "@/hooks/useHistoriqueNavigation";
import { useLayer, LAYER_PRIORITY } from "@/hooks/useLayerStack";
import { Download } from "lucide-react";
import { telechargerElementEnPdf } from "@/lib/facture-pdf";
import TemplateFactureA4 from "@/components/factures/TemplateFactureA4";

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
  canal_vente?: string | null;
  caisse_destination?: string | null;
  type_vente?: "COMPTOIR" | "YALIDINE";
  saleType?: "COMPTOIR" | "YALIDINE";
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
  const { confirmer, propsModal } = useConfirmation();
  const { afficher } = useToast();
  const { t } = useLangue();
  const [facture, setFacture] = useState<FactureDto | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [editionClient, setEditionClient] = useState(false);
  const [formatTicket, setFormatTicket] = useState(autoPrint);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [typeFacture, setTypeFacture] = useState("normale");
  const [adresse, setAdresse] = useState("");
  const [rc, setRc] = useState("");
  const [nif, setNif] = useState("");
  const [ai, setAi] = useState("");
  const [nis, setNis] = useState("");
  const [typeVente, setTypeVente] = useState<"COMPTOIR" | "YALIDINE">("COMPTOIR");
  const [envoi, setEnvoi] = useState(false);
  const [vueGarantie, setVueGarantie] = useState(false);

  useLayer("facture-garantie", vueGarantie, () => setVueGarantie(false), LAYER_PRIORITY.BOTTOM_SHEET);

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
      setTypeVente(f.type_vente ?? "COMPTOIR");
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
          type_vente: typeVente,
          saleType: typeVente,
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
    const ok = await confirmer({
      titre: "Supprimer cette facture",
      message: "Êtes-vous sûr de vouloir supprimer cette facture ? Cela annulera également les ventes et les mouvements de caisse associés.",
      labelConfirmer: "Supprimer",
      variante: "danger",
    });
    if (!ok) return;
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
  if (!facture) return (
    <div className="space-y-4 p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-8 w-32 bg-brand-light-grey/40 rounded-lg" />
        <div className="h-8 w-24 bg-brand-light-grey/30 rounded-lg" />
      </div>
      <div className="carte space-y-3">
        <div className="h-6 w-48 bg-brand-light-grey/40 rounded" />
        <div className="h-4 w-64 bg-brand-light-grey/30 rounded" />
        <div className="h-4 w-40 bg-brand-light-grey/30 rounded" />
        <div className="h-32 w-full bg-brand-light-grey/20 rounded-lg mt-4" />
      </div>
    </div>
  );

  if (vueGarantie) {
    return (
      <GarantieCertificat
        facture={facture}
        onRetour={() => setVueGarantie(false)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl w-full space-y-6 animate-entree print:max-w-none print:animate-none force-light-mode bg-brand-paper text-brand-black min-h-[100dvh] p-4 sm:p-6 rounded-2xl">
      <ConfirmerAction {...propsModal} />
      {/* Barre d'actions — masquée à l'impression */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50 print:hidden">
        <a
          href="/factures"
          onClick={(e) => {
            e.preventDefault();
            const navigue = naviguerRetourInterne(router, `/factures/${factureId}`);
            if (!navigue) {
              router.push("/factures");
            }
          }}
          className="lien inline-flex items-center gap-1.5 text-sm"
        >
          <IconeFlecheGauche taille={14} />
          Factures
        </a>
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
          <button
            type="button"
            onClick={async () => {
              if (!facture) return;
              if (invoiceRef.current) {
                afficher("Génération du PDF WYSIWYG 1:1 en cours...", "info");
                await telechargerElementEnPdf(invoiceRef.current, `facture-${facture.numero}.pdf`);
                afficher("Facture PDF 1:1 téléchargée avec succès.", "succes");
              } else {
                window.print();
              }
            }}
            className="btn bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/25 font-bold cursor-pointer"
            title="Télécharger la Facture (PDF WYSIWYG)"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger la Facture (PDF)</span>
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
              <label className="libelle mb-1.5" htmlFor="client-type-facture">{t("factures.typeFacture")}</label>
              <select id="client-type-facture" value={typeFacture} onChange={e => setTypeFacture(e.target.value)} className="champ">
                <option value="normale">{t("factureNormale")}</option>
                <option value="tva">Avec TVA (19%)</option>
                <option value="proforma">{t("factureProforma")}</option>
              </select>
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-adresse">{t("factures.adresse")}</label>
              <input id="client-adresse" type="text" value={adresse} onChange={e => setAdresse(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-rc">{t("factures.rc")}</label>
              <input id="client-rc" type="text" value={rc} onChange={e => setRc(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-nif">{t("factures.nif")}</label>
              <input id="client-nif" type="text" value={nif} onChange={e => setNif(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-nis">{t("factures.nis")}</label>
              <input id="client-nis" type="text" value={nis} onChange={e => setNis(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-ai">Art. d&apos;Imposition</label>
              <input id="client-ai" type="text" value={ai} onChange={e => setAi(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="client-type-vente">Type de vente (interne)</label>
              <select
                id="client-type-vente"
                value={typeVente}
                onChange={e => setTypeVente(e.target.value as any)}
                className="champ font-bold text-xs"
              >
                <option value="COMPTOIR">Comptoir (Caisse Normale)</option>
                <option value="YALIDINE">Yalidine (Caisse Yalidine)</option>
              </select>
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

      {/* Document imprimable WYSIWYG 1:1 — Template partagé unique */}
      {!formatTicket && (
        <TemplateFactureA4
          facture={facture}
          innerRef={invoiceRef}
          showHeader={true}
          showCachet={true}
          showActions={false}
        />
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
            <h2 className="font-bold text-sm">{t("factures.ticketCaisse")}</h2>
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
                <th className="py-1">{t("factures.qtt")}</th>
                <th className="py-1">{t("factures.article")}</th>
                <th className="py-1 text-right">{t("factures.montant")}</th>
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
            {facture.type_facture === "FACTURE_TVA" ? (
              <>
                <div className="flex justify-between font-bold mb-1">
                  <span>{t("factures.totalHT")}</span>
                  <span>{facture.total_net.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>TVA (19%)</span>
                  <span>{(facture.total_net * 0.19).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>{t("factures.timbre")}</span>
                  <span>{Math.min(10000, facture.total_net * 1.19 * 0.01).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA</span>
                </div>
                <div className="flex justify-between font-black text-base mt-2 border-t border-black pt-2">
                  <span>{t("factures.totalTTC")}</span>
                  <span>
                    {(facture.total_net * 1.19 + Math.min(10000, facture.total_net * 1.19 * 0.01)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-black text-base">
                <span>{t("factures.totalAPayer")}</span>
                <span>{facture.total_net.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA</span>
              </div>
            )}
          </div>

          <div className="text-center font-bold text-[10px]">
            <p className="mb-1">{t("factures.merci")}</p>
            <p>www.{facture.entreprise?.nom?.toLowerCase().replace(/\s+/g, '') || "solutionmaxi"}.dz</p>
          </div>
        </div>
      )}
    </div>
  );
}
