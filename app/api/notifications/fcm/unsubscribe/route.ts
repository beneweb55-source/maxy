import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const user = await utilisateurCourant();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Efface tous les tokens FCM associés à cet utilisateur.
    // Idéalement, on effacerait seulement le token de l'appareil courant,
    // mais Capacitor ne permet pas de récupérer facilement le token actuel sans le régénérer.
    // L'effacement global garantit que l'appareil déconnecté ne reçoit plus rien.
    await prisma.fcmToken.deleteMany({
      where: { user_id: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur fcm/unsubscribe:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
