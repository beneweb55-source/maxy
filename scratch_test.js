const { GoogleGenAI, Type } = require("@google/genai");
const dotenv = require("dotenv");
const dns = require("node:dns");

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

dotenv.config();

const MODEL_NAME = "gemini-3.6-flash";
const aiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

async function runTest(testName, prompt, config = {}) {
  console.log(`\n=========================================`);
  console.log(`TEST: ${testName}`);
  console.log(`PROMPT: ${prompt}`);
  console.log(`=========================================`);
  try {
    const chat = aiClient.chats.create({
      model: MODEL_NAME,
      config: Object.assign({ temperature: 0.2 }, config),
    });

    const response = await chat.sendMessage({ message: prompt });
    console.log(`✅ SUCCÈS. Résultat texte :`, response.text ? response.text.substring(0, 50) + "..." : "Aucun texte.");
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(`   Function call(s) détecté(s):`, response.functionCalls.map(c => c.name));
    }
  } catch (e) {
    console.error(`❌ ÉCHEC:`, e.message);
  }
}

async function main() {
  console.log("Vérification environnement:");
  console.log("- Clé API présente:", !!process.env.GEMINI_API_KEY);
  console.log("- Modèle:", MODEL_NAME);

  // TEST 1: Minimal
  await runTest("TEST 1 - Minimal (sans tools)", "Réponds uniquement : OK");

  // TEST 2: 1 tool
  const getProductDataTool = {
    functionDeclarations: [
      {
        name: "get_product_data",
        description: "Obtenir infos produit",
        parameters: { type: Type.OBJECT, properties: { id: { type: Type.INTEGER } }, required: ["id"] },
      }
    ]
  };
  await runTest("TEST 2 - 1 tool simple", "Analyse le produit d'ID 123", { tools: [getProductDataTool] });

  // TEST 6: Google Search
  await runTest("TEST 6 - Google Search seul", "Quel est le prix actuel d'un iPhone 16 en Algérie ?", { tools: [{ googleSearch: {} }] });
}

main();
