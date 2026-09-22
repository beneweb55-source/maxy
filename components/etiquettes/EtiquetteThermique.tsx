"use client";

import React from "react";
import Barcode from "react-barcode";
import { formaterDA } from "@/lib/caisse";
import { AFFICHER_CODE_BARRE_ETIQUETTE } from "@/lib/constantes";

export type FormatEtiquette = "50x30" | "58x40" | "40x30";

export interface ProduitEtiquette {
  id: number;
  code_interne: string;
  reference?: string;
  designation?: string;
  numero_serie?: string | null;
  grade?: string | null;
  prix_vente?: number | null;
  categorie?: string;
}

interface EtiquetteThermiqueProps {
  produit: ProduitEtiquette;
  format?: FormatEtiquette;
  className?: string;
  isLast?: boolean;
}

// Les dimensions du code-barres sont conservées : elles resservent telles
// quelles si AFFICHER_CODE_BARRE_ETIQUETTE repasse à `true`.
const CONFIG_DIMENSIONS: Record<
  FormatEtiquette,
  {
    w: string;
    h: string;
    barcodeWidth: number;
    barcodeHeight: number;
    fontSize: number;
    titreSize: string;
    footerSize: string;
    prixSize: string;
  }
> = {
  "50x30": {
    w: "50mm",
    h: "30mm",
    barcodeWidth: 1.2,
    barcodeHeight: 26,
    fontSize: 9,
    titreSize: "text-[9px]",
    footerSize: "text-[8px]",
    prixSize: "text-[12px]",
  },
  "40x30": {
    w: "40mm",
    h: "30mm",
    barcodeWidth: 0.95,
    barcodeHeight: 22,
    fontSize: 8,
    titreSize: "text-[8px]",
    footerSize: "text-[7px]",
    prixSize: "text-[11px]",
  },
  "58x40": {
    w: "58mm",
    h: "40mm",
    barcodeWidth: 1.4,
    barcodeHeight: 34,
    fontSize: 10,
    titreSize: "text-[11px]",
    footerSize: "text-[9px]",
    prixSize: "text-[14px]",
  },
};

export default function EtiquetteThermique({
  produit,
  format = "50x30",
  className = "",
  isLast = false,
}: EtiquetteThermiqueProps) {
  const conf = CONFIG_DIMENSIONS[format] || CONFIG_DIMENSIONS["50x30"];
  const titre = produit.reference || produit.designation || produit.code_interne;
  const aUnPrix =
    produit.prix_vente !== null &&
    produit.prix_vente !== undefined &&
    produit.prix_vente > 0;

  return (
    <div
      className={`etiquette-thermique-item bg-white text-black flex flex-col justify-between select-none ${className} ${
        isLast ? "is-last-label" : ""
      }`}
      style={{
        width: conf.w,
        height: conf.h,
        maxWidth: conf.w,
        maxHeight: conf.h,
        minWidth: conf.w,
        minHeight: conf.h,
        boxSizing: "border-box",
        margin: 0,
        padding: "1mm 1.5mm",
        overflow: "hidden",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* 1. En-tête : Référence + Grade, puis les détails lisibles du produit */}
      <div className="w-full overflow-hidden leading-tight border-b border-black/20 pb-0.5">
        <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
          <span
            className={`font-black uppercase tracking-tight truncate flex-1 ${conf.titreSize}`}
            title={titre}
          >
            {titre}
          </span>
          {produit.grade && (
            <span className="font-extrabold uppercase px-1 py-0.2 rounded border border-black/40 text-[7px] shrink-0 leading-none">
              {produit.grade}
            </span>
          )}
        </div>

        {produit.designation && produit.designation !== titre && (
          <div
            className={`truncate font-semibold text-neutral-600 ${conf.footerSize}`}
            title={produit.designation}
          >
            {produit.designation}
          </div>
        )}

        {produit.categorie && (
          <div className={`truncate font-bold uppercase tracking-wider text-neutral-500 ${conf.footerSize}`}>
            {produit.categorie}
          </div>
        )}
      </div>

      {/* 2. Code-barres — masqué sur l'étiquette imprimée.
          Interrupteur : AFFICHER_CODE_BARRE_ETIQUETTE (lib/constantes.ts).
          Le système code-barres reste intact ; repasser la constante à `true`
          réaffiche ce bloc tel quel. */}
      {AFFICHER_CODE_BARRE_ETIQUETTE && (
        <div className="flex items-center justify-center w-full overflow-hidden my-auto py-0.5">
          <Barcode
            value={produit.code_interne || "000000"}
            width={conf.barcodeWidth}
            height={conf.barcodeHeight}
            fontSize={conf.fontSize}
            margin={0}
            displayValue={true}
            font="monospace"
            fontOptions="bold"
            background="transparent"
            lineColor="#000000"
          />
        </div>
      )}

      {/* 3. Pied d'étiquette : Numéro de série + Prix */}
      <div className="flex items-end justify-between gap-1 w-full overflow-hidden leading-tight border-t border-black/25 pt-0.5">
        {produit.numero_serie ? (
          <span
            className={`font-mono font-bold truncate max-w-[55%] text-neutral-700 ${conf.footerSize}`}
            title={`S/N: ${produit.numero_serie}`}
          >
            S/N {produit.numero_serie}
          </span>
        ) : (
          <span className={`font-bold uppercase tracking-wider text-neutral-500 ${conf.footerSize}`}>
            Prix
          </span>
        )}

        {aUnPrix ? (
          <span className={`font-mono font-black text-black ml-auto shrink-0 ${conf.prixSize}`}>
            {formaterDA(produit.prix_vente as number)}
          </span>
        ) : (
          <span className={`font-mono font-bold text-neutral-400 ml-auto shrink-0 ${conf.footerSize}`}>
            Prix à définir
          </span>
        )}
      </div>
    </div>
  );
}
