"use client";

import { useRef, useState } from "react";
import {
  IconeBouclier,
  IconeImprimante,
  IconeFlecheGauche,
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

function dateFrLongue(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ajouterMois(date: Date, mois: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + mois);
  return result;
}

const DUREES_GARANTIE = [
  { valeur: 3, label: "3 mois" },
  { valeur: 6, label: "6 mois" },
  { valeur: 12, label: "12 mois (1 an)" },
  { valeur: 18, label: "18 mois" },
  { valeur: 24, label: "24 mois (2 ans)" },
  { valeur: 36, label: "36 mois (3 ans)" },
];

export default function GarantieCertificat({
  facture,
  onRetour,
}: {
  facture: FactureDto;
  onRetour: () => void;
}) {
  const [dureeMois, setDureeMois] = useState(facture.garantie_mois || 6);
  const [lignesSelectionnees, setLignesSelectionnees] = useState<Set<number>>(
    () => new Set(facture.lignes.filter((l) => !l.annulee).map((l) => l.id))
  );
  const certRef = useRef<HTMLDivElement>(null);

  const dateEmission = new Date(facture.date_emission);
  const dateFin = ajouterMois(dateEmission, dureeMois);

  const lignesActives = facture.lignes.filter((l) => !l.annulee);
  const lignesFiltrees = lignesActives.filter((l) =>
    lignesSelectionnees.has(l.id)
  );

  function toggleLigne(id: number) {
    setLignesSelectionnees((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function imprimerGarantie() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-entree">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50 print:hidden">
        <button
          type="button"
          onClick={onRetour}
          className="lien inline-flex items-center gap-1.5 text-sm"
        >
          <IconeFlecheGauche taille={14} />
          Retour à la facture
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={imprimerGarantie}
            className="btn btn-primaire"
          >
            <IconeImprimante taille={15} />
            Imprimer la garantie
          </button>
        </div>
      </div>

      {/* Options de garantie — masquées à l'impression */}
      <div className="carte space-y-4 print:hidden">
        <h3 className="text-base font-bold flex items-center gap-2">
          <IconeBouclier taille={18} />
          Paramètres de la garantie
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className="libelle mb-1.5"
              htmlFor="duree-garantie"
            >
              Durée de la garantie
            </label>
            <select
              id="duree-garantie"
              value={dureeMois}
              onChange={(e) => setDureeMois(Number(e.target.value))}
              className="champ"
            >
              {DUREES_GARANTIE.map((d) => (
                <option key={d.valeur} value={d.valeur}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="libelle mb-1.5">Période couverte</p>
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-black py-2">
              <span className="rounded-lg bg-emerald-50 text-emerald-800 px-3 py-1 text-xs">
                {dateFr(facture.date_emission)}
              </span>
              <span className="text-brand-grey">→</span>
              <span className="rounded-lg bg-emerald-50 text-emerald-800 px-3 py-1 text-xs">
                {dateFr(dateFin.toISOString())}
              </span>
            </div>
          </div>
        </div>

        {lignesActives.length > 1 && (
          <div>
            <p className="libelle mb-2">
              Articles couverts par la garantie
            </p>
            <div className="space-y-1.5">
              {lignesActives.map((l) => (
                <label
                  key={l.id}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm cursor-pointer transition hover:bg-brand-paper border border-brand-light-grey/50"
                >
                  <input
                    type="checkbox"
                    checked={lignesSelectionnees.has(l.id)}
                    onChange={() => toggleLigne(l.id)}
                    className="h-4 w-4 rounded border-brand-grey text-brand-orange focus:ring-brand-orange"
                  />
                  <span className="font-mono text-xs text-brand-warm-grey">
                    {l.code_interne}
                  </span>
                  <span className="font-semibold">{l.designation}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document de garantie imprimable */}
      <div
        ref={certRef}
        className="carte print:border-0 print:p-0 print:shadow-none print:m-0 print:bg-white text-black text-[13px] leading-tight"
      >
        {/* En-tête du certificat */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="bg-[#e5e7eb] p-4 rounded-xl rounded-tl-none w-[45%] text-xs border border-[#d1d5db] relative">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-1.5">
              {facture.entreprise?.nom || "Solution Maxi"}
            </h2>
            <p className="mb-2 font-medium">
              {facture.entreprise?.adresse || "Alger, Algérie"}
            </p>
            <div className="grid grid-cols-[30px_1fr] gap-x-2 gap-y-0.5">
              <span className="font-semibold">RC:</span>
              <span>{facture.entreprise?.rc || "RC XXXXXXXXX"}</span>
              <span className="font-semibold">NIF:</span>
              <span>{facture.entreprise?.nif || "NIF XXXXXXXXX"}</span>
              <span className="font-semibold">NIS:</span>
              <span>{facture.entreprise?.nis || "NIS XXXXXXXXX"}</span>
              <span className="font-semibold">N Art:</span>
              <span>{facture.entreprise?.art || "ART XXXXXXXXX"}</span>
            </div>
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
                <h1 className="text-xl font-black uppercase text-brand-black leading-none">
                  {facture.entreprise?.nom || "SOLUTION MAXI"}
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

        {/* Titre du certificat avec icône de bouclier */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl px-8 py-3">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-emerald-900">
                Certificat de Garantie
              </h2>
              <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                Réf. Facture n° {facture.numero}
              </p>
            </div>
          </div>
        </div>

        {/* Informations de la garantie */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-black rounded-xl p-3 text-xs leading-relaxed font-medium">
            <p className="font-bold text-sm mb-2 uppercase tracking-wider border-b border-black/20 pb-1">
              Bénéficiaire
            </p>
            <p>
              <span className="font-bold">Nom :</span>{" "}
              {facture.client_nom || "Particulier"}
            </p>
            {facture.client_tel && (
              <p>
                <span className="font-bold">Tél :</span>{" "}
                {facture.client_tel}
              </p>
            )}
            {facture.client_adresse && (
              <p>
                <span className="font-bold">Adresse :</span>{" "}
                {facture.client_adresse}
              </p>
            )}
          </div>

          <div className="border border-black rounded-xl p-3 text-xs leading-relaxed font-medium">
            <p className="font-bold text-sm mb-2 uppercase tracking-wider border-b border-black/20 pb-1">
              Conditions
            </p>
            <p>
              <span className="font-bold">Durée :</span> {dureeMois} mois
            </p>
            <p>
              <span className="font-bold">Début :</span>{" "}
              {dateFrLongue(facture.date_emission)}
            </p>
            <p>
              <span className="font-bold">Expiration :</span>{" "}
              <span className="font-bold text-emerald-800">
                {dateFrLongue(dateFin.toISOString())}
              </span>
            </p>
          </div>
        </div>

        {/* Tableau des articles couverts */}
        <div className="mb-6">
          <p className="font-bold text-sm mb-2 uppercase tracking-wider">
            Article(s) couvert(s) par la garantie
          </p>
          <table className="w-full border-collapse border border-black text-xs text-center">
            <thead>
              <tr className="bg-[#d1d5db]">
                <th className="border border-black py-1.5 px-2 font-bold w-12">
                  N°
                </th>
                <th className="border border-black py-1.5 px-2 font-bold w-28">
                  Code
                </th>
                <th className="border border-black py-1.5 px-2 font-bold text-left">
                  Désignation
                </th>
                {lignesFiltrees.some((l) => l.categorie) && (
                  <th className="border border-black py-1.5 px-2 font-bold">
                    Catégorie
                  </th>
                )}
                <th className="border border-black py-1.5 px-2 font-bold w-32">
                  Garantie jusqu&apos;au
                </th>
              </tr>
            </thead>
            <tbody>
              {lignesFiltrees.map((l, idx) => (
                <tr key={l.id} className="h-8">
                  <td className="border border-black px-2">{idx + 1}</td>
                  <td className="border border-black px-2 font-mono">
                    {l.code_interne}
                  </td>
                  <td className="border border-black px-2 text-left font-bold">
                    {l.designation}
                  </td>
                  {lignesFiltrees.some((l2) => l2.categorie) && (
                    <td className="border border-black px-2">
                      {l.categorie || "—"}
                    </td>
                  )}
                  <td className="border border-black px-2 font-semibold text-emerald-800">
                    {dateFr(dateFin.toISOString())}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Termes et conditions */}
        <div className="mb-6 text-xs leading-relaxed border border-black/30 rounded-lg p-4 bg-gray-50 print:bg-white">
          <p className="font-bold text-sm mb-2 uppercase tracking-wider">
            Termes et conditions
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px]">
            <li>
              La garantie couvre les défauts de fabrication et les pannes
              techniques survenant dans des conditions normales
              d&apos;utilisation.
            </li>
            <li>
              La garantie ne couvre pas les dommages causés par une
              mauvaise utilisation, des chocs, l&apos;humidité, ou toute
              intervention non autorisée.
            </li>
            <li>
              Le produit doit être retourné dans son état d&apos;origine
              avec ce certificat de garantie et la facture correspondante.
            </li>
            <li>
              La réparation ou le remplacement sera effectué dans un délai
              raisonnable après réception du produit.
            </li>
            <li>
              Ce certificat de garantie est strictement personnel et non
              transférable.
            </li>
          </ol>
        </div>

        {/* Cachet et signatures */}
        <div className="flex justify-between items-end mt-8 mb-8">
          <div className="text-center">
            <p className="text-xs font-bold mb-12 uppercase">
              Signature du client
            </p>
            <div className="border-t border-black w-44 pt-1 text-[10px] text-brand-warm-grey">
              Lu et approuvé
            </div>
          </div>

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
        <div className="bg-[#e5e7eb] py-3 px-6 text-xs text-brand-black mt-12">
          <div className="text-center font-semibold mb-2 underline underline-offset-2">
            Pour toutes informations, n&apos;hésitez pas de nous contacter
          </div>
          <div className="flex justify-between font-bold">
            <div>
              <p>Mobile :</p>
              <p className="font-normal mt-0.5">
                {facture.entreprise?.tel || "0000 00 00 00"}
              </p>
            </div>
            <div>
              <p>Courriel :</p>
              <p className="font-normal mt-0.5">
                contact@
                {facture.entreprise?.nom
                  ?.toLowerCase()
                  .replace(/\s+/g, "") || "solutionmaxi"}
                .dz
              </p>
            </div>
            <div className="text-right">
              <p>Site :</p>
              <p className="font-normal mt-0.5">
                www.
                {facture.entreprise?.nom
                  ?.toLowerCase()
                  .replace(/\s+/g, "") || "solutionmaxi"}
                .dz
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
