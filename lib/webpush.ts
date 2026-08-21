import webpush from "web-push";
import { prisma } from "./db";

// Configure Web Push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export async function sendWebPushNotification(
  userIds: number[],
  title: string,
  message: string,
  url?: string
) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: { in: userIds } },
    });

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || "/",
      icon: "/icon.svg",
    });

    const promises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error: any) {
        // If the subscription is no longer valid (e.g. user revoked permission)
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`Subscription ${sub.id} expired or unsubscribed, deleting...`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error(`Error sending push to subscription ${sub.id}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (err) {
    console.error("Failed to send web push notifications:", err);
  }
}
