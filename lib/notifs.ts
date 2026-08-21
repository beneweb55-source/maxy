import type { Prisma, Role } from "@prisma/client";

import { sendWebPushNotification } from "./webpush";
import { sendFcmNotification } from "./fcm";

export async function notifier(
  tx: Prisma.TransactionClient,
  userIds: readonly number[],
  message: string,
  lien?: string
): Promise<void> {
  if (userIds.length === 0) return;
  await tx.notification.createMany({
    data: userIds.map((user_id) => ({ user_id, message, lien })),
  });

  // Déclenche la notification web push (fire & forget) sans bloquer la transaction
  void sendWebPushNotification([...userIds], "Nouvelle notification", message, lien);
  // Déclenche la notification FCM pour Capacitor
  void sendFcmNotification([...userIds], "Nouvelle notification", message, lien);
}

export async function idsParRole(
  tx: Prisma.TransactionClient,
  ...roles: Role[]
): Promise<number[]> {
  const users = await tx.user.findMany({
    where: { role: { in: roles } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
