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

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: subscription.endpoint,
        user_id: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur unsubscribe push:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
