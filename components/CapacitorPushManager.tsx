"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useRouter } from "next/navigation";

export default function CapacitorPushManager() {
  const router = useRouter();

  useEffect(() => {
    const isPushNotificationsAvailable = Capacitor.isPluginAvailable("PushNotifications");
    if (!Capacitor.isNativePlatform() || !isPushNotificationsAvailable) {
      return;
    }

    let isMounted = true;

    const registerPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.warn("Permission for push notifications not granted");
          return;
        }

        await PushNotifications.register();
      } catch (err) {
        console.error("Failed to register push notifications", err);
      }
    };

    const addListeners = async () => {
      await PushNotifications.addListener("registration", async (token) => {
        if (!isMounted) return;
        console.log("FCM Token:", token.value);
        try {
          await fetch("/api/notifications/fcm/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: token.value, device: Capacitor.getPlatform() }),
          });
        } catch (err) {
          console.error("Failed to send FCM token to server", err);
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.error("Registration error: ", err.error);
      });

      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("Push notification received: ", notification);
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
        console.log("Push notification action performed", notification.actionId, notification.inputValue);
        const data = notification.notification.data;
        if (data && data.url) {
          router.push(data.url);
        }
      });
    };

    registerPush();
    addListeners();

    return () => {
      isMounted = false;
      PushNotifications.removeAllListeners();
    };
  }, [router]);

  return null;
}
