import { Type, type Tool } from "@google/genai";
import { prisma } from "@/lib/db";
import { formaterDA } from "@/lib/caisse";

// 1. Definition of tools for Gemini (Function Calling)
export const aiTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_product_data",
        description: "Obtenir les informations détaillées d'un produit (prix, réparations, historique, ventes). Utilisez ceci pour analyser un produit spécifique.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: {
              type: Type.INTEGER,
              description: "L'ID unique du produit dans la base de données",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "get_inventory_anomalies",
        description: "Analyser l'inventaire global pour trouver les anomalies (produits sans prix, produits dormants, marges négatives).",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "get_sales_summary",
        description: "Obtenir un résumé des ventes récentes et des performances générales (CA, marges).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            days: {
              type: Type.INTEGER,
              description: "Le nombre de jours à analyser (par défaut 30)",
            },
          },
        },
      },
    ],
  },
];

// 2. Implementation of the tools (Handlers)
export async function executeTool(call: { name: string; args: any }) {
  switch (call.name) {
    case "get_product_data":
      return await getProductData(call.args.id);
    case "get_inventory_anomalies":
      return await getInventoryAnomalies();
    case "get_sales_summary":
      return await getSalesSummary(call.args.days || 30);
    default:
      throw new Error(`Unknown tool: ${call.name}`);
  }
}

async function getProductData(id: number) {
  const produit = await prisma.produit.findUnique({
    where: { id },
    include: {
      lot: { select: { fournisseur: true, date_entree: true } },
      reparations: { select: { cout: true, description: true, date: true } },
      historique: {
        orderBy: { created_at: "desc" },
        select: { statut_avant: true, statut_apres: true, created_at: true },
      },
      ventes: {
        where: { annulee: false },
        select: { prix_vente_reel: true, date_vente: true },
      },
    },
  });

  if (!produit) {
    return { error: "Produit introuvable." };
  }

  const coutReparations = produit.reparations.reduce((acc, rep) => acc + rep.cout, 0);
  const coutDeRevient = produit.prix_achat + coutReparations;

  return {
    ...produit,
    resume_financier: {
      prix_achat: produit.prix_achat,
      cout_reparations: coutReparations,
      cout_de_revient: coutDeRevient,
      prix_vente_fixe: produit.prix_vente_fixe,
      marge_estimee: produit.prix_vente_fixe ? produit.prix_vente_fixe - coutDeRevient : null,
    },
  };
}

async function getInventoryAnomalies() {
  const produits = await prisma.produit.findMany({
    where: { statut: { not: "vendu" } },
    select: {
      id: true,
      reference: true,
      categorie: true,
      statut: true,
      prix_achat: true,
      prix_vente_fixe: true,
      created_at: true,
      reparations: { select: { cout: true } },
      lot: { select: { date_entree: true } },
    },
  });

  const maintenant = new Date().getTime();
  const JOUR_MS = 24 * 60 * 60 * 1000;

  const sansPrix = [];
  const dormants = [];
  const margeNegative = [];

  for (const p of produits) {
    const coutRep = p.reparations.reduce((sum, r) => sum + r.cout, 0);
    const coutTotal = p.prix_achat + coutRep;
    const dateEntree = p.lot?.date_entree || p.created_at;
    const joursEnStock = Math.floor((maintenant - dateEntree.getTime()) / JOUR_MS);

    if (p.statut === "ok" && !p.prix_vente_fixe) {
      sansPrix.push({ id: p.id, reference: p.reference });
    }

    if (p.prix_vente_fixe && p.prix_vente_fixe < coutTotal) {
      margeNegative.push({
        id: p.id,
        reference: p.reference,
        cout_total: formaterDA(coutTotal),
        prix_vente: formaterDA(p.prix_vente_fixe),
      });
    }

    if (joursEnStock > 90) {
      dormants.push({ id: p.id, reference: p.reference, jours: joursEnStock });
    }
  }

  return {
    resume: `Trouvé ${sansPrix.length} produits prêts sans prix, ${margeNegative.length} avec marge négative potentielle, et ${dormants.length} dormants depuis plus de 90 jours.`,
    sans_prix: sansPrix.slice(0, 10), // Limitons la taille pour éviter de saturer le contexte IA
    marge_negative: margeNegative.slice(0, 10),
    dormants_historiques: dormants.sort((a, b) => b.jours - a.jours).slice(0, 10),
  };
}

async function getSalesSummary(days: number) {
  const seuil = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const ventes = await prisma.vente.findMany({
    where: { date_vente: { gte: seuil }, annulee: false },
    include: {
      produit: {
        select: {
          categorie: true,
          prix_achat: true,
          reparations: { select: { cout: true } },
        },
      },
    },
  });

  let caTotal = 0;
  let margeTotal = 0;
  const categories: Record<string, { ca: number; qty: number }> = {};

  for (const v of ventes) {
    caTotal += v.prix_vente_reel;
    const coutRep = v.produit.reparations.reduce((sum, r) => sum + r.cout, 0);
    const marge = v.prix_vente_reel - (v.produit.prix_achat + coutRep);
    margeTotal += marge;

    const cat = v.produit.categorie;
    if (!categories[cat]) categories[cat] = { ca: 0, qty: 0 };
    categories[cat].ca += v.prix_vente_reel;
    categories[cat].qty += 1;
  }

  return {
    periode_jours: days,
    nombre_ventes: ventes.length,
    chiffre_affaires: formaterDA(caTotal),
    marge_globale: formaterDA(margeTotal),
    performances_categories: categories,
  };
}
