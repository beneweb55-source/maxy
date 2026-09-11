/**
 * API /api/admin/backup/import
 *
 * POST → Importer un fichier backup externe (multipart/form-data)
 */
import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/session";
import { BackupService } from "@/lib/backup-service";

export async function POST(req: Request) {
  try {
    const session = await utilisateurCourant();
    if (!session || (session.role !== "gerant" && session.role !== "dev")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni." },
        { status: 400 }
      );
    }

    // Vérifier taille
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le fichier dépasse la taille maximale (500 MB)." },
        { status: 400 }
      );
    }

    // Vérifier extension
    if (!file.name.endsWith(".json")) {
      return NextResponse.json(
        { error: "Seuls les fichiers .json sont acceptés." },
        { status: 400 }
      );
    }

    // Lire le contenu
    const fileContent = await file.text();

    // Importer
    const backup = await BackupService.importBackup(
      fileContent,
      file.name,
      session.id,
      session.username
    );

    return NextResponse.json({
      message: "Backup importé avec succès.",
      backup: {
        id: backup.id,
        name: backup.name,
        filename: backup.filename,
        status: backup.status,
        size: backup.size,
        checksum: backup.checksum,
        created_at: backup.created_at,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/admin/backup/import", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'import." },
      { status: 500 }
    );
  }
}
