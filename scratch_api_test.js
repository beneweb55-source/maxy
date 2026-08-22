const http = require('http');

const runTest = async (testName, prompt, context) => {
  return new Promise((resolve) => {
    console.log(`\n=== TEST: ${testName} ===`);
    console.log(`Prompt: ${prompt}`);
    
    const data = JSON.stringify({ prompt, context });

    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/ai/assistant',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(body);
            console.log(`✅ Success: ${json.reply.substring(0, 100)}...`);
          } catch(e) {
            console.log(`✅ Success (raw):`, body.substring(0, 100));
          }
        } else {
          console.error(`❌ Error body:`, body);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error:`, e.message);
      resolve();
    });
    
    req.write(data);
    req.end();
  });
};

(async () => {
  console.log("Démarrage de la suite de tests Diagnostics...");
  
  await runTest("TEST 1 - Minimal", "Réponds uniquement : OK", null);
  await runTest("TEST 2 - 1 tool simple", "Analyse le produit P-1570", { produit_id: 1 });
  await runTest("TEST 3 - Analyse inventaire", "Analyse l'inventaire et trouve les anomalies", { page: 'inventaire' });
  await runTest("TEST 4 - Analyse ventes", "Analyse les ventes récentes", { page: 'dashboard' });
  await runTest("TEST 5 - Suggère un prix", "Suggère un prix pour ce produit", { produit_id: 1 });
  await runTest("TEST 6 - Etude de marché", "Fais une étude de marché algérienne pour un iPhone 16", { page: 'dashboard' });
  await runTest("TEST 7 - Skikda/Alger", "Combien de stock à Skikda ?", null);
  await runTest("TEST 8 - Produit Null", "Analyse le produit inexistant", { produit_id: 999999 });
  
  console.log("\n=== TESTS TERMINÉS ===");
})();
