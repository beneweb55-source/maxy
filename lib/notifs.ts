import type { Prisma, Role } from "@prisma/client";

import { sendWebPushNotification } from "./webpush";
import { sendFcmNotification } from "./fcm";

/**
 * Crée une notification pour les utilisateurs concernés.
 *
 * Si `groupe` est fourni et qu'une notification non lue du même groupe existe
 * déjà pour l'utilisateur, le message est mis à jour au lieu de créer un doublon.
 */
export async function notifier(
  tx: Prisma.TransactionClient,
  userIds: readonly number[],
  message: string,
  lien?: string,
  type?: string,
  groupe?: string
): Promise<void> {
  if (userIds.length === 0) return;

  if (groupe) {
    // Pour chaque utilisateur, essayer de regrouper avec une notif existante
    for (const userId of userIds) {
      const existante = await tx.notification.findFirst({
        where: { user_id: userId, groupe, lu: false },
        select: { id: true },
      });
      if (existante) {
        await tx.notification.update({
          where: { id: existante.id },
          data: { message, lien, type, created_at: new Date() },
        });
      } else {
        await tx.notification.create({
          data: { user_id: userId, message, lien, type, groupe },
        });
      }
    }
  } else {
    await tx.notification.createMany({
      data: userIds.map((user_id) => ({ user_id, message, lien, type })),
    });
  }

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
