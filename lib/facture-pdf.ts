/**
 * Génération PDF WYSIWYG d'une facture.
 *
 * Approche : on capture le DOM rendu (template React) via html-to-image,
 * puis on le découpe en pages A4 via jsPDF.
 *
 * html-to-image utilise SVG ForeignObject → supporte nativement
 * les couleurs CSS modernes (oklch, etc.) utilisées par Tailwind v4.
 *
 * SEULE source de vérité pour le rendu PDF : le composant TemplateFactureA4.
 */

import { toPng } from "html-to-image";
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
 * @param options  - Options optionnelles
 */
export async function telechargerElementEnPdf(
  element: HTMLElement,
  nomFichier: string,
  options?: {
    echelle?: number;
    margins?: { top: number; right: number; bottom: number; left: number };
  }
): Promise<void> {
  const echelle = options?.echelle ?? 3;

  try {
    // 1. Capture du DOM rendu via html-to-image (SVG ForeignObject → PNG)
    const dataUrl = await toPng(element, {
      pixelRatio: echelle,
      backgroundColor: "#ffffff",
      skipFonts: true, // Les polices système sont déjà rendues par le navigateur
      cacheBust: true,
      style: {
        // Forcer les couleurs pour éviter tout problème de computed styles
        color: "#000000",
      },
    });

    // 2. Charger l'image dans un canvas pour mesurer
    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Impossible de charger l'image capturée"));
    });

    const imgWidthPx = img.naturalWidth;
    const imgHeightPx = img.naturalHeight;

    // 3. Calcul de la disposition multi-pages A4
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const margins = options?.margins ?? { top: 10, right: 10, bottom: 10, left: 10 };

    const usableWidth = A4_WIDTH_MM;
    const usableHeight = A4_HEIGHT_MM;

    // Ratio pixels → mm pour la largeur utile
    const pxPerMm = imgWidthPx / usableWidth;
    const imgHeightMm = imgHeightPx / pxPerMm;

    // Nombre de pages nécessaires
    const nbPages = Math.max(1, Math.ceil(imgHeightMm / usableHeight));

    // Hauteur par page en pixels (pour le découpage)
    const hauteurPagePx = imgHeightPx / nbPages;

    // 4. Découpage du canvas en pages A4
    for (let i = 0; i < nbPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      // Offset vertical en pixels sur l'image source
      const srcY = i * hauteurPagePx;

      // Créer un canvas temporaire pour cette page
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = Math.min(hauteurPagePx, imgHeightPx - srcY);

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) continue;

      // Dessiner la portion de l'image originale
      ctx.drawImage(
        img,
        0, srcY,
        imgWidthPx, pageCanvas.height,
        0, 0,
        imgWidthPx, pageCanvas.height
      );

      const pageData = pageCanvas.toDataURL("image/png");

      // Hauteur de cette page en mm (dernière page = hauteur restante)
      const pageHeightMm = pageCanvas.height / pxPerMm;

      // Position verticale avec marge
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
