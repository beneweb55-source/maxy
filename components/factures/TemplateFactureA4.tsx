"use client";

import { formaterDA } from "@/lib/caisse";
import { montantEnLettres } from "@/lib/nombres";

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

export interface LigneFactureTemplate {
  id?: number;
  designation: string;
  prix: number;
  annulee?: boolean;
  code_interne?: string;
}

export interface FactureTemplateData {
  id: number;
  numero: string;
  date_emission: string;
  type_facture: string | null; // UPPERCASE: "FACTURE_TVA" | "PROFORMA" | "DEVIS"
  client_nom?: string | null;
  client_tel?: string | null;
  client_adresse?: string | null;
  client_rc?: string | null;
  client_nif?: string | null;
  client_ai?: string | null;
  client_nis?: string | null;
  total: number;
  total_net: number;
  mode_paiement?: string | null;
  garantie_mois?: number;
  vendeur?: string;
  lignes: LigneFactureTemplate[];
  annulee?: boolean;
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

interface Props {
  facture: FactureTemplateData;
  /** Affiche l'en-tête entreprise + logo (défaut true) */
  showHeader?: boolean;
  /** Affiche la zone cachet + footer (défaut true) */
  showCachet?: boolean;
  /** Affiche les boutons d'action/impression (défaut true) */
  showActions?: boolean;
  /** Rendu adapté PDF (masque les éléments non imprimables) */
  forPdf?: boolean;
  /** ID React pour ref (ex: invoiceRef) */
  innerRef?: React.Ref<HTMLDivElement>;
}

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Titre du document selon le type (comparaison UPPERCASE) */
function titreDocument(typeFacture: string | null): string {
  switch (typeFacture) {
    case "PROFORMA":
      return "Facture Proforma";
    case "DEVIS":
      return "Devis";
    case "FACTURE_TVA":
    default:
      return "Facture";
  }
}

/** Est-ce un document avec TVA ? (comparaison UPPERCASE) */
function estTva(typeFacture: string | null): boolean {
  return typeFacture === "FACTURE_TVA";
}

/** Regroupe les lignes par designation + prix (ligne non annulée) */
function grouperLignes(lignes: LigneFactureTemplate[]) {
  const groupes: Array<{
    designation: string;
    prix: number;
    qtt: number;
    code_interne?: string;
  }> = [];

  for (const ligne of lignes) {
    if (ligne.annulee) continue;
    const existant = groupes.find(
      (g) => g.designation === ligne.designation && g.prix === ligne.prix
    );
    if (existant) {
      existant.qtt += 1;
    } else {
      groupes.push({
        designation: ligne.designation,
        prix: ligne.prix,
        qtt: 1,
        code_interne: ligne.code_interne,
      });
    }
  }

  return groupes;
}

/* ──────────────────────────────────────────────────────────
   TVA / Timbre Calculations (Source unique de vérité)
   ────────────────────────────────────────────────────────── */

function calculerTotaux(totalNet: number, avecTva: boolean) {
  const tva = avecTva ? Math.round(totalNet * 0.19) : 0;
  const baseTimbre = avecTva ? totalNet + tva : totalNet;
  const timbre = Math.min(10000, Math.round(baseTimbre * 0.01));
  const ttc = baseTimbre + timbre;
  return { totalNet, tva, timbre, ttc };
}

/* ──────────────────────────────────────────────────────────
   Composant principal
   ────────────────────────────────────────────────────────── */

export default function TemplateFactureA4({
  facture,
  showHeader = true,
  showCachet = true,
  showActions = true,
  forPdf = false,
  innerRef,
}: Props) {
  const entreprise = facture.entreprise;
  const avecTva = estTva(facture.type_facture);
  const totaux = calculerTotaux(facture.total_net, avecTva);
  const groupes = grouperLignes(facture.lignes);
  const titre = titreDocument(facture.type_facture);

  const logoSrc = "/brand/solutionmaxi-icone.svg";
  const cachetSrc = entreprise?.cachet || "/brand/cachet.png";
  const nomEntreprise = entreprise?.nom || "SOLUTION MAXI";
  const emailDomaine = nomEntreprise.toLowerCase().replace(/\s+/g, "");

  return (
    <div
      id="facture-print-area"
      ref={innerRef}
      className="carte w-full max-w-[210mm] mx-auto bg-white p-8 print:border-0 print:p-[15mm] print:shadow-none print:m-0 print:bg-white text-black text-[13px] leading-tight shadow-md border border-slate-200 print:break-inside-avoid"
    >
      {/* ── En-tête : Info entreprise à gauche, Logo à droite ── */}
      {showHeader && (
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="bg-[#e5e7eb] p-4 rounded-xl rounded-tl-none w-[45%] text-xs border border-[#d1d5db] relative">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-1.5">
              {nomEntreprise}
            </h2>
            <p className="mb-2 font-medium">
              {entreprise?.adresse || "Alger, Algérie"}
            </p>
            <div className="grid grid-cols-[30px_1fr] gap-x-2 gap-y-0.5">
              <span className="font-semibold">RC:</span>{" "}
              <span>{entreprise?.rc || "RC XXXXXXXXX"}</span>
              <span className="font-semibold">NIF:</span>{" "}
              <span>{entreprise?.nif || "NIF XXXXXXXXX"}</span>
              <span className="font-semibold">NIS:</span>{" "}
              <span>{entreprise?.nis || "NIS XXXXXXXXX"}</span>
              <span className="font-semibold">Art:</span>{" "}
              <span>{entreprise?.art || "ART XXXXXXXXX"}</span>
              <span className="font-semibold">RIB:</span>{" "}
              <span>{entreprise?.rib || "0000 00 00 00 00"}</span>
            </div>
            <div className="absolute top-0 left-0 -mt-[1px] -ml-[1px] w-4 h-4 bg-white rounded-br-xl" />
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-8 whitespace-nowrap">
              <img
                src={logoSrc}
                alt="Logo"
                crossOrigin="anonymous"
                className="h-10 w-auto object-contain"
              />
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-black uppercase text-brand-black leading-none">
                  {nomEntreprise}
                </h1>
                <p className="text-[10px] font-bold italic mt-0.5 tracking-tighter">
                  Plus de temps à perdre !
                </p>
              </div>
            </div>

            <div className="bg-[#e5e7eb] px-4 py-1.5 rounded-lg border border-[#d1d5db] text-xs font-bold w-fit">
              Le : {dateFr(facture.date_emission)}
            </div>
          </div>
        </div>
      )}

      {/* ── Titre facture ── */}
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold">
          {titre} n°: {facture.numero}
        </h2>
      </div>

      {/* ── Informations du client ── */}
      <div className="mb-6 w-full sm:w-[45%] border border-black rounded-xl p-3 text-xs leading-relaxed font-medium">
        <p className="mb-2">
          <span className="font-bold">Doit :</span>{" "}
          {facture.client_nom || "Particulier"}
        </p>
        {facture.client_tel && (
          <p>
            <span className="font-bold">Tél :</span> {facture.client_tel}
          </p>
        )}
        {facture.client_adresse && (
          <p>
            <span className="font-bold">Adresse :</span>{" "}
            {facture.client_adresse}
          </p>
        )}
        {facture.client_rc && (
          <p>
            <span className="font-bold">RC :</span> {facture.client_rc}
          </p>
        )}
        {facture.client_nif && (
          <p>
            <span className="font-bold">NIF :</span> {facture.client_nif}
          </p>
        )}
        {facture.client_ai && (
          <p>
            <span className="font-bold">AI :</span> {facture.client_ai}
          </p>
        )}
        {facture.client_nis && (
          <p>
            <span className="font-bold">NIS :</span> {facture.client_nis}
          </p>
        )}
      </div>

      {/* ── Tableau des articles ── */}
      <div className="mb-6 w-full overflow-x-auto">
        <table className="w-full min-w-[500px] border-collapse border border-black text-xs text-center">
          <thead>
            <tr className="bg-[#d1d5db]">
              <th className="border border-black py-1.5 px-2 font-bold w-12">
                N°
              </th>
              <th className="border border-black py-1.5 px-2 font-bold text-left">
                Désignation
              </th>
              <th className="border border-black py-1.5 px-2 font-bold w-12">
                U
              </th>
              <th className="border border-black py-1.5 px-2 font-bold w-16">
                Qté
              </th>
              <th className="border border-black py-1.5 px-2 font-bold w-24">
                Prix U (HT)
              </th>
              <th className="border border-black py-1.5 px-2 font-bold w-28">
                Montant HT
              </th>
            </tr>
          </thead>
          <tbody>
            {groupes.map((g, idx) => (
              <tr key={idx} className="h-8">
                <td className="border border-black px-2">{idx + 1}</td>
                <td className="border border-black px-2 text-left font-bold">
                  {g.code_interne && (
                    <span className="font-mono text-slate-600 mr-1">
                      [{g.code_interne}]
                    </span>
                  )}
                  {g.designation}
                </td>
                <td className="border border-black px-2">U</td>
                <td className="border border-black px-2">
                  {g.qtt.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="border border-black px-2 text-right">
                  {formaterDA(g.prix)}
                </td>
                <td className="border border-black px-2 text-right font-bold">
                  {formaterDA(g.prix * g.qtt)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {avecTva ? (
              <>
                <tr className="font-bold">
                  <td
                    colSpan={4}
                    className="border-t border-black border-r border-r-transparent"
                  />
                  <td className="border border-black px-2 py-1.5 text-right">
                    Total HT
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right bg-white">
                    {formaterDA(totaux.totalNet)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={4} className="border-r border-transparent" />
                  <td className="border border-black px-2 py-1.5 text-right">
                    TVA 19%
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right bg-white">
                    {formaterDA(totaux.tva)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={4} className="border-r border-transparent" />
                  <td className="border border-black px-2 py-1.5 text-right">
                    Droit Timbre 1%
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right bg-white">
                    {formaterDA(totaux.timbre)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={4} className="border-r border-transparent" />
                  <td className="border border-black px-2 py-1.5 text-right">
                    Total TTC
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right bg-white font-black">
                    {formaterDA(totaux.ttc)}
                  </td>
                </tr>
              </>
            ) : (
              <tr className="font-bold">
                <td
                  colSpan={4}
                  className="border-t border-black border-r border-r-transparent"
                />
                <td className="border border-black px-2 py-1.5 text-right">
                  Total HT
                </td>
                <td className="border border-black px-2 py-1.5 text-right bg-white">
                  {formaterDA(totaux.totalNet)}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* ── Arrêté de facture (montant en lettres + mode de règlement) ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div className="w-full sm:w-1/2 p-3 bg-slate-50 border border-black rounded-xl text-xs space-y-1">
          <div className="font-bold">
            Arrêtée la présente facture à la somme de :
          </div>
          <div className="italic font-medium text-slate-800">
            {montantEnLettres(totaux.totalNet)}
          </div>
          <div className="pt-2 text-[11px] text-slate-600">
            Mode de règlement :{" "}
            <strong className="uppercase">
              {facture.mode_paiement || "Espèces"}
            </strong>
            {facture.garantie_mois && (
              <>
                {" · "}Garantie :{" "}
                <strong>{facture.garantie_mois} Mois</strong>
              </>
            )}
          </div>
        </div>

        {/* Résumé des totaux (côté droit, visible sur desktop) */}
        {avecTva && (
          <div className="w-full sm:w-[40%] space-y-1 text-xs print:hidden">
            <div className="flex justify-between border-b border-black py-1">
              <span>Total Brut HT :</span>
              <span className="font-mono font-bold">
                {formaterDA(totaux.totalNet)}
              </span>
            </div>
            <div className="flex justify-between border-b border-black py-1">
              <span>TVA (19%) :</span>
              <span className="font-mono font-bold">
                {formaterDA(totaux.tva)}
              </span>
            </div>
            <div className="flex justify-between bg-[#d1d5db] p-2 border border-black font-black text-sm">
              <span>TOTAL TTC :</span>
              <span className="font-mono">{formaterDA(totaux.ttc)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Cachet et signature ── */}
      {showCachet && (
        <div className="flex justify-between items-end pt-4 border-t border-slate-300 text-xs">
          <div>
            {facture.vendeur && (
              <div>
                Émis par : <strong>{facture.vendeur}</strong>
              </div>
            )}
            <div className="text-[10px] text-slate-500">
              Document généré automatiquement
            </div>
          </div>
          <div className="relative w-64 h-32">
            {cachetSrc && (
              <img
                src={cachetSrc}
                alt="Cachet"
                className="absolute inset-0 w-full h-full object-contain opacity-90 mix-blend-multiply"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Pied de page ── */}
      {showCachet && (
        <div className="bg-[#e5e7eb] py-3 px-6 text-xs text-brand-black mt-8">
          <div className="text-center font-semibold mb-2 underline underline-offset-2">
            Pour toutes informations, n&apos;hésitez pas de nous contacter
          </div>
          <div className="flex justify-between font-bold">
            <div>
              <p>Mobile :</p>
              <p className="font-normal mt-0.5">
                {entreprise?.tel || "0000 00 00 00"}
              </p>
            </div>
            <div>
              <p>Courriel :</p>
              <p className="font-normal mt-0.5">
                contact@{emailDomaine}.dz
              </p>
            </div>
            <div className="text-right">
              <p>Site :</p>
              <p className="font-normal mt-0.5">
                www.{emailDomaine}.dz
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
