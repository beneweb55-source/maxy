import { Type, type Tool } from "@google/genai";
import { prisma } from "@/lib/db";
import { formaterDA } from "@/lib/caisse";
import type { Role } from "@prisma/client";

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
      {
        name: "search_inventory",
        description: "Rechercher des produits dans l'inventaire selon des critères spécifiques (ex: catégorie, stock, etc.).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "Terme de recherche global (référence, code interne)",
            },
            categorie: {
              type: Type.STRING,
              description: "Filtre par catégorie",
            },
            statut: {
              type: Type.STRING,
              description: "Filtre par statut (recu, en_test, ok, a_reparer, manque_piece, hs, en_vente, vendu)",
            },
            en_vitrine: {
              type: Type.BOOLEAN,
              description: "Filtre pour les produits en vitrine uniquement",
            }
          }
        }
      },
      {
        name: "get_daily_priorities",
        description: "Obtenir la liste des priorités du jour (anomalies, produits sans prix, dormants).",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      },
      {
        name: "propose_action",
        description: "Proposer une action (comme modifier le prix ou la vitrine) à l'utilisateur. L'action sera soumise à validation.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "Type d'action: 'update_price' ou 'toggle_vitrine'",
            },
            produit_id: {
              type: Type.INTEGER,
              description: "ID du produit",
            },
            new_price: {
              type: Type.INTEGER,
              description: "Nouveau prix proposé (si action = update_price)",
            },
            en_vitrine: {
              type: Type.BOOLEAN,
              description: "Mettre en vitrine (true/false) (si action = toggle_vitrine)",
            },
            confidence: {
              type: Type.STRING,
              description: "Niveau de confiance (high, medium, low)",
            },
            reason: {
              type: Type.STRING,
              description: "Raison de cette recommandation",
            },
          },
          required: ["action", "produit_id", "confidence", "reason"],
        }
      }
    ],
  },
];

// 2. Implementation of the tools (Handlers)
export async function executeTool(call: { name: string; args: any }, user: { id: number; role: Role }) {
  switch (call.name) {
    case "get_product_data":
      return await getProductData(call.args.id, user);
    case "get_inventory_anomalies":
      return await getInventoryAnomalies(user);
    case "get_sales_summary":
      return await getSalesSummary(call.args.days || 30, user);
    case "search_inventory":
      return await searchInventory(call.args, user);
    case "get_daily_priorities":
      return await getDailyPriorities(user);
    case "propose_action":
      return { 
        status: "action_proposed", 
        message: "L'action a été proposée avec succès à l'utilisateur. Ne cherchez pas à l'exécuter vous-même.",
        action: call.args 
      };
    default:
      throw new Error(`Unknown tool: ${call.name}`);
  }
}

async function getProductData(id: number, user: { role: Role }) {
  const produit = await prisma.produit.findUnique({
    where: { id },
    include: {
      lot: { select: { fournisseur: true, date_entree: true } },
      reparations: { select: { cout: true, description: true, date: true, user: { select: { username: true } } } },
      historique: {
        orderBy: { created_at: "desc" },
        select: { statut_avant: true, statut_apres: true, created_at: true, user: { select: { username: true } } },
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

  if (user.role === "social_media" && produit.statut !== "en_vente" && produit.statut !== "vendu") {
     return { error: "Accès refusé. Produit non visible pour ce rôle." };
  }

  const coutReparations = produit.reparations.reduce((acc, rep) => acc + rep.cout, 0);
  const coutDeRevient = produit.prix_achat + coutReparations;

  const resume_financier = user.role === "social_media" 
    ? { prix_vente_fixe: produit.prix_vente_fixe } 
    : {
        prix_achat: produit.prix_achat,
        cout_reparations: coutReparations,
        cout_de_revient: coutDeRevient,
        prix_vente_fixe: produit.prix_vente_fixe,
        marge_estimee: produit.prix_vente_fixe ? produit.prix_vente_fixe - coutDeRevient : null,
      };

  return {
    ...produit,
    resume_financier,
  };
}

async function getInventoryAnomalies(user: { role: Role }) {
  if (user.role === "social_media") return { error: "Accès refusé." };

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
    sans_prix: sansPrix.slice(0, 10),
    marge_negative: margeNegative.slice(0, 10),
    dormants_historiques: dormants.sort((a, b) => b.jours - a.jours).slice(0, 10),
  };
}

async function getSalesSummary(days: number, user: { role: Role }) {
  if (user.role === "social_media") return { error: "Accès refusé." };

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

async function searchInventory(args: any, user: { role: Role }) {
  const where: any = { statut: { not: "vendu" } };
  
  if (user.role === "social_media") {
    where.statut = "en_vente";
  } else if (args.statut) {
    where.statut = args.statut;
  }
  
  if (args.categorie) where.categorie = { contains: args.categorie, mode: "insensitive" };
  if (args.en_vitrine) where.en_vitrine = true;
  if (args.query) {
    where.OR = [
      { reference: { contains: args.query, mode: "insensitive" } },
      { code_interne: { contains: args.query, mode: "insensitive" } }
    ];
  }

  const produits = await prisma.produit.findMany({
    where,
    take: 20,
    select: {
      id: true,
      code_interne: true,
      reference: true,
      categorie: true,
      statut: true,
      prix_vente_fixe: true,
      en_vitrine: true,
      ...(user.role !== "social_media" && { prix_achat: true })
    }
  });

  return {
    total_trouves: produits.length,
    produits: produits.slice(0, 20),
    message: produits.length === 20 ? "Affichage limité aux 20 premiers résultats." : ""
  };
}

async function getDailyPriorities(user: { role: Role }) {
  if (user.role === "social_media") return { error: "Accès refusé." };
  
  const anomalies = await getInventoryAnomalies(user);
  
  const lotsRecents = await prisma.lot.findMany({
    where: { statut_lot: { not: "valide" } },
    take: 5,
    orderBy: { date_entree: "desc" },
    select: { id: true, fournisseur: true, statut_lot: true, date_entree: true }
  });
  
  return {
    title: "Priorités du Jour",
    anomalies: anomalies,
    lots_en_attente: lotsRecents,
  };
}
