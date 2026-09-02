import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Capture haute définition WYSIWYG (1:1) d'un élément DOM et export PDF A4 direct.
 * Élimine toute divergence de template en reproduisant l'élément affiché au pixel près.
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
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
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
