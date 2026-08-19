"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Barcode from "react-barcode";

interface EtiquetteData {
  id: number;
  code_interne: string;
  reference: string;
  prix_vente: number | null;
}

export default function ImprimerEtiquettes() {
  const searchParams = useSearchParams();
  const [etiquettes, setEtiquettes] = useState<EtiquetteData[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

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

    // Charger les détails des produits
    fetch(`/api/produits/masse/details?ids=${ids.join(",")}`)
      .then(res => {
        if (!res.ok) throw new Error("Erreur de chargement");
        return res.json();
      })
      .then((data: EtiquetteData[]) => {
        setEtiquettes(data);
        // Lancer l'impression automatiquement une fois chargé
        setTimeout(() => window.print(), 500);
      })
      .catch(() => setErreur("Erreur lors du chargement des données d'impression."));
  }, [searchParams]);

  if (erreur) return <div className="p-8 text-danger">{erreur}</div>;
  if (etiquettes.length === 0) return <div className="p-8">Chargement des étiquettes...</div>;

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          @page { margin: 0; size: 50mm 30mm landscape; } /* Format standard pour étiquettes */
        }
        @media screen {
          .print-container { padding: 2rem; background: #f0f0f0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
          .etiquette { border: 1px dashed #ccc; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        }
      `}} />

      <div className="no-print mb-4 flex w-full max-w-sm justify-between">
        <button onClick={() => window.close()} className="btn btn-secondaire">Fermer</button>
        <button onClick={() => window.print()} className="btn btn-primaire">Imprimer</button>
      </div>

      {etiquettes.map((etiquette, index) => (
        <div 
          key={`${etiquette.id}-${index}`} 
          className="etiquette flex flex-col items-center justify-center bg-white w-[50mm] h-[30mm] overflow-hidden page-break p-1"
        >
          <div className="text-[10px] font-bold text-center leading-tight mb-1 truncate w-full px-1">
            {etiquette.reference}
          </div>
          <Barcode 
            value={etiquette.code_interne} 
            width={1.5} 
            height={30} 
            fontSize={11}
            margin={10}
            displayValue={true}
          />
          {etiquette.prix_vente && (
            <div className="text-[11px] font-extrabold mt-0.5">
              {etiquette.prix_vente} DA
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
