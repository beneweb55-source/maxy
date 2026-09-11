/**
 * API /api/admin/backup
 *
 * GET  → Lister tous les backups
 * POST → Créer un nouveau backup
 */
import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/session";
import { BackupService } from "@/lib/backup-service";

export async function GET() {
  try {
    const session = await utilisateurCourant();
    if (!session || (session.role !== "gerant" && session.role !== "dev")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const backups = await BackupService.listBackups();
    return NextResponse.json({ backups });
  } catch (error: any) {
    console.error("GET /api/admin/backup", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des sauvegardes." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await utilisateurCourant();
    if (!session || (session.role !== "gerant" && session.role !== "dev")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = body.name || `Backup du ${new Date().toLocaleDateString("fr-FR")}`;
    const description = body.description || null;

    const { backup, recordCounts } = await BackupService.createBackup({
      name,
      description,
      type: "manual",
      userId: session.id,
      username: session.username,
    });

    return NextResponse.json({
      message: "Sauvegarde créée avec succès.",
      backup: {
        id: backup.id,
        name: backup.name,
        filename: backup.filename,
        status: backup.status,
        size: backup.size,
        checksum: backup.checksum,
        version: backup.version,
        created_at: backup.created_at,
      },
      recordCounts,
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/admin/backup", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création de la sauvegarde." },
      { status: 500 }
    );
  }
}
