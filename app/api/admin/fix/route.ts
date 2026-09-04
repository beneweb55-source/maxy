import { NextResponse } from "next/server";

/**
 * DÉSACTIVÉ — Cet endpoint contenait une logique de backdoor hardcodée.
 * Supprimé pour des raisons de sécurité.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Endpoint désactivé." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Endpoint désactivé." },
    { status: 410 }
  );
}
