import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await utilisateurCourant();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });
    }

    // On utilise upsert pour ne pas avoir de doublons si l'endpoint existe déjà
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        user_id: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get("user-agent") || null,
      },
      create: {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get("user-agent") || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur subscribe push:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
