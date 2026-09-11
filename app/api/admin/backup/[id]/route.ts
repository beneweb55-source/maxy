/**
 * API /api/admin/backup/[id]
 *
 * GET    → Détails d'un backup (métadonnées uniquement)
 * DELETE → Supprimer un backup
 */
import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/session";
import { BackupService } from "@/lib/backup-service";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await utilisateurCourant();
    if (!session || (session.role !== "gerant" && session.role !== "dev")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const backupId = parseInt(id, 10);
    if (isNaN(backupId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
      select: {
        id: true, name: true, filename: true, description: true,
        status: true, type: true, size: true, checksum: true,
        storageKey: true, version: true, databaseVersion: true,
        applicationVersion: true, metadata: true, error: true,
        cree_par: true, cree_par_nom: true,
        created_at: true, updated_at: true,
      },
    });

    if (!backup) {
      return NextResponse.json({ error: "Backup introuvable." }, { status: 404 });
    }

    // Vérifier intégrité
    const integrity = await BackupService.verifyIntegrity(backupId);

    return NextResponse.json({ backup, integrity });
  } catch (error: any) {
    console.error("GET /api/admin/backup/[id]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du backup." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await utilisateurCourant();
    if (!session || (session.role !== "gerant" && session.role !== "dev")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const backupId = parseInt(id, 10);
    if (isNaN(backupId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    await BackupService.deleteBackup(backupId, session.id, session.username);

    return NextResponse.json({ message: "Backup supprimé avec succès." });
  } catch (error: any) {
    console.error("DELETE /api/admin/backup/[id]", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression." },
      { status: 500 }
    );
  }
}
