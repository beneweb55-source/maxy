import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const user = await utilisateurCourant();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { token, device } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    await prisma.fcmToken.upsert({
      where: { token },
      update: {
        user_id: user.id,
        device: device || "android",
      },
      create: {
        user_id: user.id,
        token: token,
        device: device || "android",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur fcm/subscribe:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
