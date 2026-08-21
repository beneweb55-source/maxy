self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Écouteur fetch vide requis par Safari iOS pour valider la PWA
self.addEventListener("fetch", (event) => {
  // Pass-through
});

self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/brand/solutionmaxi-icone.svg",
      badge: "/brand/solutionmaxi-icone.svg",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
        url: data.url || "/",
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Cherche un client ouvert
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ("focus" in client && "navigate" in client) {
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      // Si aucun onglet n'est ouvert, on ouvre une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
