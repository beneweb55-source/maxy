import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Capture haute définition WYSIWYG (1:1) d'un élément DOM et export PDF A4.
 * Gère la pagination automatique pour les factures longues (multi-pages).
 * Le rendu PDF est identique à ce qui est affiché à l'écran (WYSIWYG).
 */
export async function telechargerElementEnPdf(
  element: HTMLElement,
  nomFichier: string = "facture.pdf"
): Promise<void> {
  if (typeof window === "undefined" || !element) return;

  // Attendre que les polices web soient stabilisées
  if (document.fonts) {
    await document.fonts.ready;
  }

  // Capture Canvas HD avec scale: 3 pour une qualité d'impression 300 DPI
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 1200,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

  // Calculer la hauteur de l'image dans les unités PDF
  const imgPdfHeight = (canvas.height * pdfWidth) / canvas.width;

  if (imgPdfHeight <= pdfHeight) {
    // L'image tient sur une seule page
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgPdfHeight, undefined, "FAST");
  } else {
    // Pagination : découper l'image en tranches de la hauteur d'une page PDF
    const pageCanvasHeight = (pdfHeight / imgPdfHeight) * canvas.height;

    let yOffset = 0;
    let isFirstPage = true;

    while (yOffset < canvas.height) {
      if (!isFirstPage) {
        pdf.addPage();
      }

      // Extraire la tranche courante du canvas
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(pageCanvasHeight, canvas.height - yOffset);

      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, yOffset, canvas.width, sliceCanvas.height,
          0, 0, canvas.width, sliceCanvas.height
        );

        const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.98);
        const slicePdfHeight = (sliceCanvas.height * pdfWidth) / canvas.width;

        pdf.addImage(sliceData, "JPEG", 0, 0, pdfWidth, slicePdfHeight, undefined, "FAST");
      }

      yOffset += pageCanvasHeight;
      isFirstPage = false;
    }
  }

  pdf.save(nomFichier);
}

/**
 * Rétrocompatibilité legacy : capture directement l'élément #facture-print-area
 */
export async function genererFacturePdf(data?: any): Promise<void> {
  if (typeof window === "undefined") return;

  const el = document.getElementById("facture-print-area");
  if (el) {
    const num = data?.numero || "document";
    await telechargerElementEnPdf(el, `facture-${num}.pdf`);
  } else {
    window.print();
  }
}
