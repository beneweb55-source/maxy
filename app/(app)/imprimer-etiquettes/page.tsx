"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Barcode from "react-barcode";
import { IconeImprimante } from "@/components/icons";
import { useLangue } from "@/lib/i18n/contexte";
import { formaterDA } from "@/lib/caisse";

interface EtiquetteData {
  id: number;
  code_interne: string;
  reference: string;
  prix_vente: number | null;
}

export default function ImprimerEtiquettes() {
  const { t } = useLangue();
  const searchParams = useSearchParams();
  const [etiquettes, setEtiquettes] = useState<EtiquetteData[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [aImprime, setAImprime] = useState(false);
  const [marquee, setMarquee] = useState(false);

  useEffect(() => {
    const idsParams = searchParams?.get("ids");
    if (!idsParams) {
      setErreur("Aucun identifiant fourni pour l'impression.");
      return;
    }

    const ids = idsParams.split(",").map(Number).filter(id => !isNaN(id));

    if (ids.length === 0) {
      setErreur("Identifiants invalides.");
      return;
    }

    // Charger les détails des produits — SANS marquer comme imprimées
    fetch(`/api/produits/masse/details?ids=${ids.join(",")}`)
      .then(res => {
        if (!res.ok) throw new Error("Erreur de chargement");
        return res.json();
      })
      .then((data: EtiquetteData[]) => {
        setEtiquettes(data);
      })
      .catch(() => setErreur("Erreur lors du chargement des données d'impression."));
  }, [searchParams]);

  function lancerImpression() {
    window.print();
    setAImprime(true);
  }

  async function confirmerImpression() {
    const idsParams = searchParams?.get("ids");
    if (!idsParams) return;
    const ids = idsParams.split(",").map(Number).filter(id => !isNaN(id));
    
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
          .page-break { page-break-after: always; }
          @page { margin: 0; size: 58mm 43mm; } /* Format standard pour étiquettes */
        }
        @media screen {
          .print-container { padding: 2rem; background: #f0f0f0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
          .etiquette { border: 1px dashed #ccc; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        }
      `}} />

      <div className="no-print mb-4 flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-4 shadow-sm border border-brand-light-grey">
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

      {etiquettes.map((etiquette, index) => (
        <div 
          key={`${etiquette.id}-${index}`} 
          className="etiquette flex flex-col items-center justify-center bg-white w-[58mm] h-[43mm] overflow-hidden page-break p-1"
        >
          <div className="text-[10px] font-bold text-center leading-tight mb-1 truncate w-full px-1">
            {etiquette.reference || etiquette.code_interne}
          </div>
          <Barcode 
            value={etiquette.code_interne} 
            width={2} 
            height={40} 
            fontSize={12}
            margin={10}
            displayValue={true}
          />
          {etiquette.prix_vente !== null && etiquette.prix_vente !== undefined && (
            <div className="text-[11px] font-extrabold mt-0.5">
              {formaterDA(etiquette.prix_vente)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
