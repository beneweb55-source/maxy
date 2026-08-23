import { useState, useEffect, useCallback } from "react";

export function useOfflineSync() {
  const [estEnLigne, setEstEnLigne] = useState(true);
  const [fileAttente, setFileAttente] = useState(0);

  const checkQueueCount = useCallback(() => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage("GET_QUEUE_COUNT");
    }
  }, []);

  useEffect(() => {
    // Initial status
    setEstEnLigne(navigator.onLine);

    const handleOnline = () => {
      setEstEnLigne(true);
      forceSync();
    };
    const handleOffline = () => setEstEnLigne(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen to messages from Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "QUEUE_COUNT") {
        setFileAttente(event.data.count);
      } else if (event.data && event.data.type === "SYNC_COMPLETE") {
        setFileAttente(0);
      }
    };
    
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
      
      checkQueueCount();
      const interval = setInterval(checkQueueCount, 5000);
      
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        navigator.serviceWorker.removeEventListener("message", handleMessage);
        clearInterval(interval);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkQueueCount]);

  const forceSync = useCallback(() => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage("FORCE_SYNC");
      if ("SyncManager" in window) {
        navigator.serviceWorker.ready.then(reg => {
          // @ts-ignore
          if (reg.sync) {
            // @ts-ignore
            reg.sync.register("sync-statuts").catch(() => {
               navigator.serviceWorker.controller?.postMessage("FORCE_SYNC");
            });
          }
        });
      }
    }
  }, []);

  return { estEnLigne, fileAttente, forceSync };
}
