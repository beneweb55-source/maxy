"use client";

import { useEffect, useState } from "react";
import { IconeCloche } from "./icons";
import { useLangue } from "@/lib/i18n/contexte";

// Clé publique VAPID depuis le .env
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushManager() {
  const { t } = useLangue();
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      // Enregistre le service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered");
          // Vérifie si on a déjà un abonnement
          return registration.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub) {
            setSubscription(sub);
          }
        })
        .catch((err) => console.error("Service Worker Error", err));
    }
  }, []);

  const subscribe = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      setSubscription(sub);

      // Envoyer l'abonnement au serveur
      await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        body: JSON.stringify(sub),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Erreur de souscription:", err);
    }
  };

  if (!isSupported || permission === "denied" || subscription) {
    return null; // Rien à afficher si non supporté, refusé, ou déjà abonné
  }

  return (
    <div className="bg-brand-paper p-3 mb-2 rounded-lg border border-brand-orange/30">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-brand-orange">
          <IconeCloche taille={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-brand-smooth">Activer les notifications système</p>
          <p className="text-xs text-brand-warm-grey mt-1">
            Recevez des alertes (ex: stock critique) même quand l'application est fermée ou en arrière-plan.
          </p>
          <button
            onClick={subscribe}
            className="mt-2 text-xs font-bold text-brand-orange hover:underline"
          >
            Autoriser
          </button>
        </div>
      </div>
    </div>
  );
}
