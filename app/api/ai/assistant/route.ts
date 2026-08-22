import { NextResponse, type NextRequest } from "next/server";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { aiClient, MODEL_NAME } from "@/lib/ai/config";
import { aiTools, executeTool } from "@/lib/ai/tools";
import { Type, FunctionCallingConfigMode } from "@google/genai";

async function sendMessageWithRetry(chat: any, message: any, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Setup timeout for network requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const res = await chat.sendMessage({ message }, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (e: any) {
      if (e.name === 'AbortError' || e.message?.includes('timeout')) {
        console.error(`[GEMINI DEBUG] Timeout reçu (tentative ${attempt + 1}/${maxRetries})`);
        if (attempt >= maxRetries) throw new Error("TIMEOUT");
        continue;
      }
      if (e?.status === 429 && attempt < maxRetries) {
        const delay = 3000 * (attempt + 1);
        console.log(`[GEMINI DEBUG] 429 reçu, retry dans ${delay}ms (tentative ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
}

export async function POST(request: NextRequest) {
  // 1. Authentification stricte
  const acces = await exigerUtilisateur(["gerant", "dev", "technicien", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user!;

  try {
    console.log("[GEMINI DEBUG] 1. Début de la requête AI pour utilisateur:", user.username);
    const body = await request.json();
    const { prompt, context, locale = "fr" } = body;

    if (!prompt) {
      return erreur(400, "Le prompt est requis.");
    }
    
    if (!process.env.GEMINI_API_KEY) {
      console.log("[GEMINI DEBUG] ERREUR: Clé manquante");
      return erreur(503, "L'assistant IA est temporairement indisponible (Clé manquante côté serveur).");
    }

    // Préparation des instructions système
    let systemInstruction = `Tu es le Copilote IA intégré à "Gestion-Maxy-v2", un logiciel de gestion de magasin (informatique/matériel).
Règles absolues :
1. Ne devine JAMAIS l'emplacement physique d'un produit (Skikda/Alger/Non attribué).
2. N'invente pas de données ni de sources. Si un tool échoue ou renvoie une erreur, informe l'utilisateur que cette partie de l'analyse n'a pas pu être effectuée, mais continue avec les autres informations disponibles.
3. Si l'utilisateur te demande de modifier un prix, de mettre en vitrine, utilise STRICTEMENT le tool 'propose_action'. Le système s'occupera d'afficher le bouton d'application à l'utilisateur. Ne génère pas de blocs de code JSON manuels dans le texte pour les actions.
4. Pour estimer un prix, vérifie que les caractéristiques critiques sont présentes, classe tes comparables (exact, proche), donne tes sources et ton niveau de confiance.
5. Langue exigée : ${locale === "fr" ? "Français" : "English"}.
`;

    if (context) {
      systemInstruction += `\nContexte actuel de l'interface : ${JSON.stringify(context)}`;
    }

    const needsSearch = prompt.toLowerCase().includes("marché") || 
                        prompt.toLowerCase().includes("algérie") || 
                        prompt.toLowerCase().includes("prix actuel") ||
                        prompt.toLowerCase().includes("recherche");
    
    const activeTools = [...aiTools];
    if (needsSearch) {
        console.log("[GEMINI DEBUG] Activation du Grounding Google Search");
        activeTools.push({ googleSearch: {} } as any);
    }

    const chat = aiClient.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction,
        tools: activeTools.length > 0 ? activeTools : undefined,
        ...(activeTools.length > 0 && {
            toolConfig: {
              includeServerSideToolInvocations: true,
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.AUTO,
              },
            }
        })
      },
    });

    let response = await sendMessageWithRetry(chat, prompt);
    let actionsProposees: any[] = [];

    // Boucle d'exécution des outils (Function Calling)
    let safetyLoopCounter = 0;
    while (response.functionCalls && response.functionCalls.length > 0 && safetyLoopCounter < 5) {
      safetyLoopCounter++;
      const calls = response.functionCalls;
      console.log(`[GEMINI DEBUG] Exécution de ${calls.length} tool(s)`);

      const functionResponseParts = [];
      for (const call of calls) {
        if (!call.name) continue;
        let toolResult;
        try {
          // Injection sécurisée de l'utilisateur dans les outils
          toolResult = await executeTool({ name: call.name, args: call.args }, user);
          
          // Interception de propose_action pour le frontend
          if (call.name === "propose_action") {
            actionsProposees.push(call.args);
          }
        } catch (e: any) {
          console.error(`[GEMINI DEBUG] ERREUR dans le tool ${call.name}:`, e);
          toolResult = { error: `Échec du tool: ${e.message}` };
        }
        functionResponseParts.push({
          functionResponse: { name: call.name, response: toolResult },
        });
      }

      response = await sendMessageWithRetry(chat, functionResponseParts);
    }

    const finalContent = response.text;

    return NextResponse.json({
      reply: finalContent,
      actions: actionsProposees,
    });

  } catch (e: any) {
    console.error("[GEMINI DEBUG] ERREUR FATALE GLOBALE:", e);
    
    if (e.message === "TIMEOUT") {
      return erreur(504, "Le service met trop de temps à répondre. Veuillez réessayer.");
    }
    if (e?.status === 429) {
      return erreur(429, "Trop de demandes en ce moment. Veuillez patienter avant de réessayer.");
    }
    if (e?.status === 400 || e?.status === 403) {
       return erreur(400, "Le modèle IA a refusé ou n'a pas pu traiter la demande. Vérifiez votre requête.");
    }
    
    if (process.env.NODE_ENV === "development") {
        return erreur(500, `Erreur serveur IA: ${e.message}`);
    }
    return erreur(500, "Désolé, l'assistant IA est temporairement indisponible suite à une erreur technique.");
  }
}

