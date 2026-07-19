import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { exigerUtilisateur } from "@/lib/api";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  
  // Seuls les gérants (et potentiellement les dev) peuvent utiliser l'IA de pricing
  if (acces.user.role !== "gerant" && acces.user.role !== "dev") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Clé d'API Gemini manquante." }, { status: 500 });
    }

    const body = await req.json();
    const { reference, categorie, etat, prix_achat, cout_reparations } = body;

    const cout_total = (prix_achat || 0) + (cout_reparations || 0);

    const prompt = `
Tu es un expert du marché de l'électronique d'occasion en Algérie (téléphones, ordinateurs, etc.).
Ton objectif est de recommander un prix de vente optimal pour un produit afin d'assurer une bonne rentabilité (au moins 20% de marge si possible) tout en restant compétitif sur le marché local.

Voici le produit que je dois tarifer :
- Référence : ${reference}
- Catégorie : ${categorie}
- État général : ${etat}
- Coût d'achat : ${prix_achat} DA
- Coût des réparations effectuées : ${cout_reparations} DA
- Coût de revient total : ${cout_total} DA

Utilise l'outil de recherche Google pour chercher les prix actuels de ce produit en Algérie (par exemple sur Ouedkniss ou d'autres plateformes algériennes).
Assure-toi de comparer des produits dans un état similaire (neuf vs occasion/réparé).

Format de réponse souhaité (en JSON strict, aucun texte brut avant ou après) :
{
  "fourchette_basse": nombre (prix minimum suggéré sur le marché en DA),
  "fourchette_haute": nombre (prix maximum suggéré en DA),
  "prix_recommande": nombre (le prix de vente final que tu me conseilles de fixer en DA),
  "justification": "Une explication courte de 2-3 phrases de ton choix, citant l'état du marché et la marge prévue."
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
    console.error("Erreur API Gemini (Prix):", error);
    return NextResponse.json(
      { error: "Impossible de générer l'estimation avec l'IA." },
      { status: 500 }
    );
  }
}
