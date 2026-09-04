/**
 * Génération PDF WYSIWYG d'une facture.
 *
 * Approche : on capture le DOM rendu (template React) via html2canvas,
 * puis on le découpe en pages A4 via jsPDF.
 *
 * SEULE source de vérité pour le rendu PDF : le composant TemplateFactureA4.
 * Ce module ne contient PAS de template alternatif.
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** Largeur utile d'une page A4 paysage en mm (après margins 10mm) */
const A4_WIDTH_MM = 297 - 20;
/** Hauteur utile d'une page A4 paysage en mm (après margins 10mm) */
const A4_HEIGHT_MM = 210 - 20;

/**
 * Génère un PDF WYSIWYG à partir d'un élément DOM affiché à l'écran.
 *
 * @param element  - L'élément HTML à capturer (doit être rendu et visible)
 * @param nomFichier - Nom du fichier PDF à télécharger
 * @param options  - Options optionnelles (échelle, fond transparent, margins)
 */
export async function telechargerElementEnPdf(
  element: HTMLElement,
  nomFichier: string,
  options?: {
    echelle?: number;
    fondTransparent?: boolean;
    margins?: { top: number; right: number; bottom: number; left: number };
  }
): Promise<void> {
  const echelle = options?.echelle ?? 3;
  const fondTransparent = options?.fondTransparent ?? false;

  try {
    // 1. Capture du DOM rendu via html2canvas
    const canvas = await html2canvas(element, {
      scale: echelle,
      useCORS: true,
      allowTaint: true,
      backgroundColor: fondTransparent ? null : "#ffffff",
      logging: false,
    });

    // 2. Conversion en image
    const imageData = canvas.toDataURL("image/png");

    // 3. Calcul de la disposition multi-pages A4
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const margins = options?.margins ?? { top: 10, right: 10, bottom: 10, left: 10 };

    const usableWidth = A4_WIDTH_MM;
    const usableHeight = A4_HEIGHT_MM;

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    // Ratio pixels → mm pour la largeur utile
    const pxPerMm = imgWidthPx / usableWidth;

    const imgHeightMm = imgHeightPx / pxPerMm;

    // Nombre de pages nécessaires
    const nbPages = Math.ceil(imgHeightMm / usableHeight);

    // Calcul de la hauteur par page en pixels (pour le découpage du canvas)
    const hauteurPagePx = imgHeightPx / nbPages;

    // 4. Découpage du canvas en pages A4
    for (let i = 0; i < nbPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      // Offset vertical en pixels sur le canvas source
      const srcY = i * hauteurPagePx;

      // Créer un canvas temporaire pour cette page
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = Math.min(hauteurPagePx, imgHeightPx - srcY);

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) continue;

      // Dessiner la portion de l'image originale
      ctx.drawImage(
        canvas,
        0, srcY,                // Source x, y
        imgWidthPx, pageCanvas.height,  // Source width, height
        0, 0,                   // Dest x, y
        imgWidthPx, pageCanvas.height   // Dest width, height
      );

      const pageData = pageCanvas.toDataURL("image/png");

      // Calculer la hauteur de cette page en mm (dernière page = hauteur restante)
      const pageHeightMm = (pageCanvas.height / pxPerMm);

      // Centrer verticalement si la page est plus courte que A4
      const yOffset = margins.top;

      pdf.addImage(pageData, "PNG", margins.left, yOffset, usableWidth, pageHeightMm);
    }

    // 5. Téléchargement
    pdf.save(nomFichier);
  } catch (err) {
    console.error("Erreur génération PDF:", err);
    // Fallback : impression navigateur
    window.print();
  }
}
