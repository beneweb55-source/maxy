const CACHE_NAME = "maxy-offline-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/brand/solutionmaxi-logo-fonce.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pour les API de mutation de statut (offline-first queue)
  if (request.method === "POST" && url.pathname === "/api/produits/masse/statut") {
    event.respondWith(
      fetch(request.clone()).catch(() => {
        // En cas d'échec réseau, on stocke la requête dans IndexedDB
        return requeteVersQueue(request).then(() => {
          return new Response(JSON.stringify({ ok: true, offline: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        });
      })
    );
    return;
  }

  // Stratégie Network-first, fallback to Cache pour le reste (pages, api GET)
  if (request.method === "GET") {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        // Cache la réponse réseau
        const clonedResponse = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });
        return networkResponse;
      }).catch(async () => {
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        
        // Si c'est une requête de page et qu'elle n'est pas en cache, retourner l'index offline
        if (request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/");
        }
        
        throw new Error("Offline and no cache");
      })
    );
  }
});

// Sync event (Background Sync API)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-statuts") {
    event.waitUntil(syncQueue());
  }
});

// Helpers pour IndexedDB
function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("maxy-offline-db", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("sync-queue")) {
        db.createObjectStore("sync-queue", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function requeteVersQueue(request) {
  const body = await request.clone().json();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync-queue", "readwrite");
    const store = tx.objectStore("sync-queue");
    store.add({
      url: request.url,
      method: request.method,
      headers: Array.from(request.headers.entries()),
      body: body,
      timestamp: Date.now()
    });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function syncQueue() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync-queue", "readwrite");
    const store = tx.objectStore("sync-queue");
    const request = store.getAll();
    
    request.onsuccess = async () => {
      const items = request.result;
      if (items.length === 0) return resolve();
      
      let allSuccess = true;
      for (const item of items) {
        try {
          const res = await fetch(item.url, {
            method: item.method,
            headers: Object.fromEntries(item.headers),
            body: JSON.stringify(item.body)
          });
          
          if (res.ok) {
            // Delete from queue if successful
            const delTx = db.transaction("sync-queue", "readwrite");
            delTx.objectStore("sync-queue").delete(item.id);
          } else {
            allSuccess = false;
          }
        } catch (err) {
          allSuccess = false;
          console.error("Sync error:", err);
        }
      }
      
      if (allSuccess) {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: "SYNC_COMPLETE" }));
        });
      }
      resolve();
    };
    request.onerror = reject;
  });
}

// Handle messages from clients (e.g. manual sync)
self.addEventListener("message", (event) => {
  if (event.data === "FORCE_SYNC") {
    event.waitUntil(syncQueue());
  } else if (event.data === "GET_QUEUE_COUNT") {
    event.waitUntil(
      getDB().then(db => {
        const tx = db.transaction("sync-queue", "readonly");
        const countReq = tx.objectStore("sync-queue").count();
        countReq.onsuccess = () => {
          event.source.postMessage({ type: "QUEUE_COUNT", count: countReq.result });
        };
      })
    );
  }
});
