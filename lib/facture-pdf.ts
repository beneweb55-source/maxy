import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formaterDA } from "@/lib/caisse";

export interface LigneFacturePdf {
  code_interne?: string | null;
  designation: string;
  numero_serie?: string | null;
  grade?: string | null;
  quantite: number;
  prix_unitaire: number;
  total_ligne: number;
}

export interface DonneesFacturePdf {
  numero: string;
  date: string | Date;
  type_document?: string; // "FACTURE", "DEVIS", "PROFORMA", "TICKET"
  vendeur?: string | null;
  type_paiement?: string | null;
  garantie_mois?: number | null;
  garantie_fin?: string | Date | null;
  client?: {
    nom?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    rc?: string | null;
    nif?: string | null;
    nis?: string | null;
    ai?: string | null;
  } | null;
  lignes: LigneFacturePdf[];
  total_ht?: number;
  remise_globale?: number;
  total_tva?: number;
  total_ttc: number;
  notes?: string | null;
}

export function genererFacturePdf(data: DonneesFacturePdf) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. En-tête Entreprise
  doc.setFillColor(249, 115, 22); // Brand Orange
  doc.rect(margin, margin, 4, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(24, 24, 27); // slate-900
  doc.text("SOLUTION MAX", margin + 8, margin + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122); // slate-500
  doc.text("Solutions Informatiques, Matériel Reconditionné & Neuf", margin + 8, margin + 12);
  doc.text("Tél : +213 (0) 550 00 00 00 | Email : contact@solutionmax.dz", margin + 8, margin + 16);

  // Bloc Document (Numéro & Date) à droite
  const typeTitre = data.type_document || "FACTURE DE VENTE";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(249, 115, 22);
  doc.text(typeTitre, pageWidth - margin, margin + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(`N° : ${data.numero}`, pageWidth - margin, margin + 11, { align: "right" });

  const dateFormatee = new Date(data.date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(`Date : ${dateFormatee}`, pageWidth - margin, margin + 16, { align: "right" });

  // Ligne de séparation
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.4);
  doc.line(margin, margin + 22, pageWidth - margin, margin + 22);

  // 2. Informations Client & Règlement
  let startY = margin + 28;

  // Box Client (Gauche)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, startY, (pageWidth - margin * 2) / 2 - 3, 30, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(249, 115, 22);
  doc.text("CLIENT / DESTINATAIRE", margin + 4, startY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(data.client?.nom || "Client Particulier (Comptant)", margin + 4, startY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91);
  if (data.client?.telephone) {
    doc.text(`Tél : ${data.client.telephone}`, margin + 4, startY + 16);
  }
  if (data.client?.adresse) {
    doc.text(`Adresse : ${data.client.adresse}`, margin + 4, startY + 20);
  }
  if (data.client?.nif || data.client?.rc) {
    const fiscal = [
      data.client.rc ? `RC: ${data.client.rc}` : "",
      data.client.nif ? `NIF: ${data.client.nif}` : "",
    ].filter(Boolean).join(" | ");
    doc.text(fiscal, margin + 4, startY + 24);
  }

  // Box Transaction & Règlement (Droite)
  const rightBoxX = margin + (pageWidth - margin * 2) / 2 + 3;
  const rightBoxWidth = (pageWidth - margin * 2) / 2 - 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, startY, rightBoxWidth, 30, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(249, 115, 22);
  doc.text("DÉTAILS DU RÈGLEMENT", rightBoxX + 4, startY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91);
  doc.text(`Mode de Paiement : ${(data.type_paiement || "Espèces").toUpperCase()}`, rightBoxX + 4, startY + 11);
  if (data.vendeur) {
    doc.text(`Conseiller / Vendeur : ${data.vendeur}`, rightBoxX + 4, startY + 16);
  }
  const garantieMois = data.garantie_mois ?? 6;
  doc.text(`Garantie Matériel : ${garantieMois} Mois`, rightBoxX + 4, startY + 21);

  // 3. Tableau des Articles
  const tableData = data.lignes.map((l, index) => {
    let designationComplete = l.designation;
    if (l.numero_serie) {
      designationComplete += `\nS/N : ${l.numero_serie}`;
    }
    if (l.grade) {
      designationComplete += ` (${l.grade})`;
    }

    return [
      String(index + 1),
      l.code_interne || "—",
      designationComplete,
      String(l.quantite),
      formaterDA(l.prix_unitaire),
      formaterDA(l.total_ligne),
    ];
  });

  autoTable(doc, {
    startY: startY + 36,
    margin: { left: margin, right: margin },
    head: [["#", "SKU / Réf", "Désignation & Numéro de Série", "Qté", "P.U (DA)", "Total (DA)"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "left",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [39, 39, 42],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 26, fontStyle: "bold" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 32, halign: "right", fontStyle: "bold" },
    },
  });

  // Position après le tableau
  let finalY = (doc as any).lastAutoTable.finalY + 6;

  // Vérifier s'il faut changer de page
  if (finalY + 60 > pageHeight) {
    doc.addPage();
    finalY = margin + 10;
  }

  // 4. Totaux & Récapitulatif
  const totauxBoxWidth = 75;
  const totauxX = pageWidth - margin - totauxBoxWidth;

  doc.setFillColor(254, 243, 199); // amber/light
  doc.roundedRect(totauxX, finalY, totauxBoxWidth, 22, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 53, 15);
  doc.text("TOTAL NET À PAYER (TTC)", totauxX + 4, finalY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(249, 115, 22);
  doc.text(formaterDA(data.total_ttc), totauxX + totauxBoxWidth - 4, finalY + 16, { align: "right" });

  // 5. Encart Garantie Matérielle (Très visible)
  const garantieBoxWidth = totauxX - margin - 6;
  doc.setFillColor(240, 253, 244); // emerald light
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, finalY, garantieBoxWidth, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text(`CERTIFICAT & GARANTIE MATÉRIELLE : ${garantieMois} MOIS`, margin + 4, finalY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61);
  doc.text(
    "La garantie couvre les pannes matérielles (hors casse, choc, surtension et oxydation).",
    margin + 4,
    finalY + 11
  );
  doc.text("Ce document tient lieu de bon de garantie officiel. Conservez-le précieusement.", margin + 4, finalY + 16);

  // 6. Pied de page
  const footerY = pageHeight - margin + 2;
  doc.setDrawColor(228, 228, 231);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(161, 161, 170);
  doc.text("Solution Max — Système de Gestion Commerciale & POS", margin, footerY);
  doc.text("Merci pour votre confiance !", pageWidth - margin, footerY, { align: "right" });

  // Sauvegarde automatique du PDF
  const nomFichier = `Facture_${data.numero.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  doc.save(nomFichier);
}
