import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { exigerUtilisateur } from "@/lib/api";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  
  if (acces.user.role !== "gerant" && acces.user.role !== "dev") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Clé d'API Gemini manquante." }, { status: 500 });
    }

    const body = await req.json();
    const { reference, categorie, pannes, prix_achat, devis_reparation } = body;

    const prompt = `
Tu es un expert en gestion de stock et réparation d'électronique en Algérie.
Ton objectif est de conseiller le gérant sur la meilleure décision à prendre concernant un produit défectueux ou nécessitant des réparations.

Détails du produit :
- Référence : ${reference}
- Catégorie : ${categorie}
- Prix d'achat initial : ${prix_achat} DA
- Pannes/Problèmes identifiés : ${pannes}
- Devis estimé pour la réparation : ${devis_reparation} DA

Instructions :
1. Recherche sur le web (Ouedkniss, etc.) la valeur actuelle de ce produit sur le marché algérien (en bon état).
2. Évalue si la réparation vaut le coup (est-ce que le coût d'achat + réparation laisse une marge de revente ?).
3. Suggère la meilleure décision parmi : "reparation", "vente_pieces" (vendre pour pièces), ou "retour" (retour fournisseur).

Format de réponse souhaité (en JSON strict) :
{
  "valeur_marche_estimee": nombre (la valeur de revente estimée une fois réparé en DA),
  "decision_recommandee": "reparation" | "vente_pieces" | "retour",
  "analyse": "Un paragraphe d'explication détaillant ton raisonnement (comparaison des coûts vs valeur de marché)."
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("Réponse vide de Gemini");
    }

    const data = JSON.parse(response.text);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur API Gemini (Décision):", error);
    return NextResponse.json(
      { error: "Impossible de générer l'aide à la décision avec l'IA." },
      { status: 500 }
    );
  }
}
