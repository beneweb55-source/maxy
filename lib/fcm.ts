import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "./db";

let isFirebaseInitialized = false;

function initFirebase() {
  if (isFirebaseInitialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Replace actual newlines in env var if provided as literal string
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin credentials missing in .env (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). FCM will be disabled.");
    return;
  }

  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    isFirebaseInitialized = true;
  } catch (error) {
    console.error("Firebase Admin initialization error", error);
  }
}

export async function sendFcmNotification(
  userIds: number[],
  title: string,
  message: string,
  url?: string
) {
  initFirebase();
  if (!isFirebaseInitialized) return;

  try {
    const fcmTokens = await prisma.fcmToken.findMany({
      where: { user_id: { in: userIds } },
    });

    if (fcmTokens.length === 0) return;

    const payload = {
      notification: {
        title,
        body: message,
      },
      data: {
        url: url || "/",
      },
    };

    const promises = fcmTokens.map(async (tokenObj) => {
      try {
        await getMessaging().send({
          token: tokenObj.token,
          ...payload,
        });
      } catch (error: any) {
        // If the token is no longer valid, delete it
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          console.log(`FCM Token ${tokenObj.id} expired, deleting...`);
          await prisma.fcmToken.delete({ where: { id: tokenObj.id } });
        } else {
          console.error(`Error sending FCM to token ${tokenObj.id}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (err) {
    console.error("Failed to send FCM notifications:", err);
  }
}
