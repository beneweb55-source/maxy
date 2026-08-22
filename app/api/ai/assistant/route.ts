import { NextResponse, type NextRequest } from "next/server";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { aiClient, MODEL_NAME } from "@/lib/ai/config";
import { aiTools, executeTool } from "@/lib/ai/tools";
import { Type, FunctionCallingConfigMode } from "@google/genai";

async function sendMessageWithRetry(chat: any, message: any, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await chat.sendMessage({ message });
    } catch (e: any) {
      if (e?.status === 429 && attempt < maxRetries) {
        const delay = 1500 * (attempt + 1);
        console.log(`[GEMINI DEBUG] 429 reçu, retry dans ${delay}ms (tentative ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
}

export async function POST(request: NextRequest) {
  // 1. Authentification
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    console.log("[GEMINI DEBUG] 1. Début de la requête AI");
    const { prompt, context } = await request.json();

    if (!prompt) {
      return erreur(400, "Le prompt est requis.");
    }
    
    console.log("[GEMINI DEBUG] 2. Payload lu:", { prompt: prompt.substring(0, 50), context });

    if (!process.env.GEMINI_API_KEY) {
      console.log("[GEMINI DEBUG] ERREUR: Clé manquante");
      return erreur(503, "L'assistant IA est temporairement indisponible (Clé manquante).");
    }
    console.log("[GEMINI DEBUG] 3. Clé API présente (longueur:", process.env.GEMINI_API_KEY.length, ")");

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

    console.log("[GEMINI DEBUG] 4. Création du chat avec le modèle:", MODEL_NAME);
    
    // N'activer Google Search que si le prompt le demande explicitement
    // pour éviter de consommer le quota (429) sur de simples questions.
    const needsSearch = prompt.toLowerCase().includes("marché") || 
                        prompt.toLowerCase().includes("algérie") || 
                        prompt.toLowerCase().includes("prix actuel") ||
                        prompt.toLowerCase().includes("recherche");
    
    const activeTools = [...aiTools];
    if (needsSearch) {
        console.log("[GEMINI DEBUG] 4b. Activation du Grounding Google Search");
        activeTools.push({ googleSearch: {} } as any);
    }

    // Configuration de Gemini
    const chat = aiClient.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction,
        tools: activeTools.length > 0 ? activeTools : undefined,
        ...(activeTools.length > 0 && {
            toolConfig: {
              includeServerSideToolInvocations: true,
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.VALIDATED,
              },
            }
        })
      },
    });

    console.log("[GEMINI DEBUG] 5. Envoi du message initial...");
    // Envoyer le message initial avec backoff
    let response = await sendMessageWithRetry(chat, prompt);
    console.log("[GEMINI DEBUG] 6. Réponse initiale reçue. Function calls présents ?", !!(response.functionCalls && response.functionCalls.length > 0));

    // Boucle d'exécution des outils (Function Calling)
    while (response.functionCalls && response.functionCalls.length > 0) {
      const calls = response.functionCalls;
      console.log(`[GEMINI DEBUG] 7. Exécution de ${calls.length} tool(s):`, calls.map((c: any) => c.name));

      const functionResponseParts = [];
      for (const call of calls) {
        if (!call.name) continue;
        let toolResult;
        try {
          toolResult = await executeTool({ name: call.name, args: call.args });
          console.log(`[GEMINI DEBUG] 8. Tool ${call.name} exécuté avec succès.`);
        } catch (e: any) {
          console.error(`[GEMINI DEBUG] ERREUR dans le tool ${call.name}:`, e);
          toolResult = { error: e.message };
        }
        functionResponseParts.push({
          functionResponse: { name: call.name, response: toolResult },
        });
      }

      console.log(`[GEMINI DEBUG] 9. Renvoi de ${functionResponseParts.length} résultat(s) au modèle...`);
      response = await sendMessageWithRetry(chat, functionResponseParts);
      console.log(`[GEMINI DEBUG] 10. Nouvelle réponse du modèle reçue.`);
    }

    console.log("[GEMINI DEBUG] 11. Parsing de la réponse finale.");
    // Récupérer le texte final
    const finalContent = response.text;

    return NextResponse.json({
      reply: finalContent,
    });

  } catch (e: any) {
    console.error("[GEMINI DEBUG] ERREUR FATALE GLOBALE:", e);
    
    if (e?.status === 429) {
      return erreur(429, "Trop de demandes en ce moment, réessaie dans quelques secondes.");
    }
    
    // En développement, on renvoie l'erreur détaillée pour aider au diagnostic
    if (process.env.NODE_ENV === "development") {
        return erreur(500, `Erreur serveur: ${e.message}`);
    }
    return erreur(500, "Une erreur s'est produite lors de la communication avec l'assistant IA.");
  }
}
