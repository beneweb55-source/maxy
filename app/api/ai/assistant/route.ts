import { NextResponse, type NextRequest } from "next/server";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { aiClient, MODEL_NAME } from "@/lib/ai/config";
import { aiTools, executeTool } from "@/lib/ai/tools";
import { Type } from "@google/genai";

export async function POST(request: NextRequest) {
  // 1. Authentification
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const { prompt, context } = await request.json();

    if (!prompt) {
      return erreur(400, "Le prompt est requis.");
    }

    if (!process.env.GEMINI_API_KEY) {
      return erreur(503, "L'assistant IA est temporairement indisponible (Clé manquante).");
    }

    // Préparation des instructions système
    let systemInstruction = `Tu es l'assistant IA intégré à "Gestion-Maxy-v2", un logiciel de gestion de magasin (informatique/matériel).
Règles absolues :
- Ne devine JAMAIS l'emplacement physique d'un produit (Skikda/Alger/Non attribué). Ces données n'existent pas encore.
- N'invente pas de données. Si tu n'as pas l'information, dis-le.
- Si on te demande de modifier quelque chose (ex: prix, vitrine), tu dois proposer l'action sous forme de suggestion JSON formattée.
- Sois concis, professionnel et va droit au but.

Options de suggestion JSON (à utiliser SEULEMENT si tu recommandes une modification):
Si tu recommandes un changement de prix, ajoute à la fin de ton texte un bloc JSON strict de ce type :
\`\`\`json
{ "action": "update_price", "produit_id": 123, "new_price": 25000 }
\`\`\`
Si tu recommandes de modifier la vitrine :
\`\`\`json
{ "action": "toggle_vitrine", "produit_id": 123, "en_vitrine": true }
\`\`\`
`;

    if (context) {
      systemInstruction += `\nContexte actuel de l'utilisateur : ${JSON.stringify(context)}`;
    }

    // Configuration de Gemini
    const chat = aiClient.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        tools: [
          ...aiTools, 
          { googleSearch: {} } // Activation de la recherche Google pour les prix du marché algérien
        ],
      },
    });

    // Envoyer le message initial
    let response = await chat.sendMessage({ message: prompt });

    // Boucle d'exécution des outils (Function Calling)
    while (
      response.functionCalls &&
      response.functionCalls.length > 0
    ) {
      const call = response.functionCalls[0];
      if (!call || !call.name) break;

      let toolResult;
      try {
        toolResult = await executeTool({ name: call.name, args: call.args });
      } catch (e: any) {
        toolResult = { error: e.message };
      }

      // Renvoyer le résultat de l'outil au modèle
      response = await chat.sendMessage({
        message: [{
          functionResponse: {
            name: call.name,
            response: toolResult,
          }
        }] as any
      });
    }

    // Récupérer le texte final
    const finalContent = response.text;

    return NextResponse.json({
      reply: finalContent,
    });

  } catch (e: any) {
    console.error("Erreur IA:", e);
    // On ne fait pas planter l'application
    return erreur(500, "Une erreur s'est produite lors de la communication avec l'assistant IA.");
  }
}
