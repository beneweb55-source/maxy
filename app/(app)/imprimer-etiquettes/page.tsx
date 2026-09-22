"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Barcode from "react-barcode";
import { IconeImprimante } from "@/components/icons";
import { useLangue } from "@/lib/i18n/contexte";
import { formaterDA } from "@/lib/caisse";
import { AFFICHER_CODE_BARRE_ETIQUETTE } from "@/lib/constantes";

interface EtiquetteData {
  id: number;
  code_interne: string;
  reference: string;
  designation?: string | null;
  categorie?: string | null;
  numero_serie?: string | null;
  grade?: string | null;
  prix_vente: number | null;
}

export default function ImprimerEtiquettes() {
  const { t } = useLangue();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [etiquettes, setEtiquettes] = useState<EtiquetteData[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [aImprime, setAImprime] = useState(false);
  const [marquee, setMarquee] = useState(false);

  // Auth guard — redirect if not logged in
  useEffect(() => {
    fetch("/api/auth/me").then((res) => {
      if (!res.ok) router.replace("/connexion");
    }).catch(() => router.replace("/connexion"));
  }, [router]);

  useEffect(() => {
    const idsParams = searchParams?.get("ids");
    const codesParams = searchParams?.get("codes");

    // La sélection arrive soit par ids (inventaire, caisse, commandes),
    // soit par codes internes (impression directe après création au terrain).
    const requete = idsParams
      ? `ids=${encodeURIComponent(idsParams)}`
      : codesParams
        ? `codes=${encodeURIComponent(codesParams)}`
        : null;

    if (!requete) {
      setErreur("Aucun identifiant fourni pour l'impression.");
      return;
    }

    // Charger les détails des produits — SANS marquer comme imprimées
    fetch(`/api/produits/masse/details?${requete}`)
      .then(async (res) => {
        if (!res.ok) {
          const corps = await res.json().catch(() => null);
          throw new Error(corps?.error || "Erreur de chargement");
        }
        return res.json();
      })
      .then((data: EtiquetteData[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setErreur("Aucun produit trouvé pour cette sélection.");
          return;
        }
        setEtiquettes(data);
      })
      .catch((e: Error) =>
        setErreur(e.message || "Erreur lors du chargement des données d'impression.")
      );
  }, [searchParams]);

  function lancerImpression() {
    window.print();
    setAImprime(true);
  }

  async function confirmerImpression() {
    // On marque exactement les produits dont les étiquettes sont affichées,
    // quel que soit le mode d'entrée (ids ou codes internes).
    const ids = etiquettes.map((e) => e.id);
    if (ids.length === 0) return;

    try {
      const res = await fetch("/api/produits/marquer-imprime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setMarquee(true);
      }
    } catch (err) {
      console.error("Erreur de marquage", err);
    }
  }

  if (erreur) return <div className="p-8 text-danger">{erreur}</div>;
  if (etiquettes.length === 0) return <div className="p-8">{t("inventaire.chargementEtiquettes")}</div>;

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
          .etiquettes-grid {
            display: grid;
            grid-template-columns: repeat(3, 58mm);
            justify-content: center;
            gap: 0;
            page-break-after: auto;
          }
          .etiquette {
            page-break-inside: avoid;
            break-inside: avoid;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 5mm;
            size: A4;
          }
        }
        @media screen {
          .print-container { padding: 2rem; background: #f0f0f0; min-height: 100dvh; max-width: 100%; overflow-x: hidden; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
          .etiquettes-grid { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
          .etiquette { border: 1px dashed #ccc; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        }
      `}} />

      <div className="no-print mb-4 flex w-full max-w-md flex-col gap-4 rounded-lg bg-white dark:bg-brand-paper p-4 shadow-sm border border-brand-light-grey dark:border-white/10">
        {!aImprime ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-brand-dark-grey font-medium">
              Aperçu des étiquettes prêt.
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => window.close()} className="btn btn-secondaire">Fermer</button>
              <button onClick={lancerImpression} className="btn btn-primaire">
                <IconeImprimante taille={16} /> Imprimer
              </button>
            </div>
          </div>
        ) : !marquee ? (
          <div className="text-center space-y-4 animate-entree">
            <p className="text-base font-bold text-brand-black">
              Les étiquettes ont-elles bien été imprimées ?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { setAImprime(false); window.close(); }}
                className="btn btn-secondaire"
              >
                Non / Annuler
              </button>
              <button
                onClick={() => void confirmerImpression()}
                className="btn bg-succes text-white hover:bg-succes/90 font-bold"
              >
                Oui, étiquettes imprimées
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 animate-entree">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-succes/10 px-4 py-3 text-base font-bold text-succes">
              Marquées comme imprimées
            </span>
            <p className="text-sm text-brand-warm-grey">Vous pouvez maintenant fermer cette fenêtre.</p>
            <button onClick={() => window.close()} className="btn btn-secondaire mx-auto mt-2">Fermer la fenêtre</button>
          </div>
        )}
      </div>

      <div className="etiquettes-grid">
      {etiquettes.map((etiquette, index) => (
        <div
          key={`${etiquette.id}-${index}`}
          className="etiquette flex flex-col justify-between bg-white text-black w-[58mm] h-[43mm] overflow-hidden px-2 py-1.5"
        >
          {/* 1. Identité produit : référence (nom du modèle), désignation, catégorie, grade */}
          <div className="w-full">
            <div className="text-[11px] font-black uppercase leading-[1.15] tracking-tight break-words line-clamp-2">
              {etiquette.reference || etiquette.code_interne}
            </div>
            {etiquette.designation && etiquette.designation !== etiquette.reference && (
              <div className="mt-0.5 text-[8px] font-semibold leading-tight text-neutral-600 line-clamp-2">
                {etiquette.designation}
              </div>
            )}
            {(etiquette.categorie || etiquette.grade) && (
              <div className="mt-0.5 flex items-center gap-1">
                {etiquette.categorie && (
                  <span className="max-w-[65%] truncate rounded border border-neutral-300 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-neutral-700">
                    {etiquette.categorie}
                  </span>
                )}
                {etiquette.grade && (
                  <span className="ml-auto shrink-0 rounded bg-neutral-900 px-1 py-px text-[7px] font-black uppercase tracking-wider text-white">
                    {etiquette.grade}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2. Code-barres — masqué sur l'étiquette imprimée.
              Interrupteur : AFFICHER_CODE_BARRE_ETIQUETTE (lib/constantes.ts).
              Le système code-barres reste intact (données, /api/scan) ;
              repasser la constante à `true` réaffiche ce bloc. */}
          {AFFICHER_CODE_BARRE_ETIQUETTE && (
            <Barcode
              value={etiquette.code_interne}
              width={1.6}
              height={36}
              fontSize={11}
              margin={4}
              displayValue={true}
            />
          )}

          {/* 3. Numéro de série — identifiant unique de l'exemplaire, s'il existe */}
          {etiquette.numero_serie && (
            <div className="w-full truncate font-mono text-[8px] font-semibold text-neutral-600">
              S/N {etiquette.numero_serie}
            </div>
          )}

          {/* 4. Prix — la seule information chiffrée de l'étiquette */}
          <div className="flex w-full items-end justify-between border-t border-black/25 pt-0.5">
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
              Prix
            </span>
            {etiquette.prix_vente !== null &&
            etiquette.prix_vente !== undefined &&
            etiquette.prix_vente > 0 ? (
              <span className="font-mono text-[14px] font-black leading-none">
                {formaterDA(etiquette.prix_vente)}
              </span>
            ) : (
              <span className="font-mono text-[10px] font-bold leading-none text-neutral-400">
                Prix à définir
              </span>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
