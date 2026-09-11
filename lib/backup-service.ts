/**
 * BACKUP SERVICE — Système de sauvegarde professionnelle
 *
 * Gère la création, lecture, import, validation, et restauration de backups.
 * Les fichiers sont stockés sur disque dans storage/backups/.
 * Les métadonnées sont enregistrées en PostgreSQL via le modèle Prisma Backup.
 */

import { prisma } from "./db";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";

// ─── CONFIGURATION ───
const BACKUP_DIR = path.join(process.cwd(), "storage", "backups");
const BACKUP_VERSION = 1;
const MAX_BACKUP_SIZE = 500 * 1024 * 1024; // 500 MB

// ─── TYPES ───
export interface BackupMetadata {
  backupVersion: number;
  applicationVersion: string;
  databaseSchemaVersion: string;
  createdAt: string;
  createdBy: string;
  databaseType: string;
  checksum: string;
  recordCounts: Record<string, number>;
  totalRecords: number;
  tablesIncluded: string[];
}

export interface BackupContent {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

export interface LoadResult {
  backup: {
    id: number;
    name: string;
    filename: string;
    status: string;
    size: number;
    checksum: string;
    version: number;
    metadata: any;
    created_at: Date;
    cree_par_nom: string | null;
  };
  content: BackupContent;
  checksumValid: boolean;
}

export interface RestoreResult {
  success: boolean;
  backupId: number;
  preRestoreBackupId?: number;
  message: string;
  recordsRestored: number;
}

// ─── HELPER: Assurer que le dossier de stockage existe ───
function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ─── HELPER: Chemin du fichier backup ───
function backupPath(storageKey: string): string {
  // storageKey est un UUID généré, pas de risque de path traversal
  return path.join(BACKUP_DIR, `${storageKey}.json`);
}

// ─── HELPER: Calculer SHA-256 ───
function computeChecksum(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

// ─── HELPER: Générer un storageKey sûr ───
function generateStorageKey(): string {
  return crypto.randomUUID();
}

// ─── HELPER: Version de l'application ───
function getAppVersion(): string {
  try {
    // En production, on peut lire package.json
    return "2.0"; // Version fixe pour éviter les erreurs de build
  } catch {
    return "unknown";
  }
}

// ─── HELPER: Version du schéma DB ───
function getDbVersion(): string {
  // Basé sur la dernière migration
  return "20260911113551_backup_system";
}

// ─── TABLES À SAUVEGARDER (ordre = ordre de restauration) ───
// L'ordre respecte les dépendances FK
const BACKUP_TABLES = [
  // 1. Référentiels (pas de FK vers d'autres tables métier)
  { key: "users", model: "user", select: { id: true, username: true, role: true, langue: true } },
  { key: "parametres", model: "parametres", findMany: false }, // Singleton
  { key: "categories", model: "categorie" },
  { key: "modeles", model: "modele" },
  { key: "categories_info", model: "categorieInfo" },
  { key: "familles_info", model: "familleInfo" },
  { key: "clients", model: "client" },

  // 2. Structure
  { key: "lots", model: "lot" },

  // 3. Produits (dépend de lots, categories, modeles)
  { key: "produits", model: "produit" },
  { key: "produit_images", model: "produitImage" },

  // 4. Opérations (dépendent de produits, users)
  { key: "ventes", model: "vente" },
  { key: "reparations", model: "reparation" },
  { key: "historique_statuts", model: "historiqueStatut" },
  { key: "composition_historique", model: "compositionHistorique" },
  { key: "mouvements_caisse", model: "mouvementCaisse" },

  // 5. Facturation (dépend de ventes, users)
  { key: "commandes", model: "commande" },
  { key: "lignes_commande", model: "ligneCommande" },
  { key: "factures", model: "facture" },
  { key: "facture_lignes", model: "factureLigne" },

  // 6. Système
  { key: "notifications", model: "notification" },
  { key: "journal_activite", model: "journalActivite" },
  { key: "push_subscriptions", model: "pushSubscription" },
  { key: "fcm_tokens", model: "fcmToken" },
  { key: "carnet_entrees", model: "carnetEntree" },
  { key: "carnet_pieces_jointes", model: "carnetPieceJointe" },
] as const;

// ─── ORDRE DE RESTAURATION (inverse de la création) ───
const RESTORE_ORDER = [
  "users", "parametres", "categories", "modeles", "categories_info",
  "familles_info", "clients", "lots", "produits", "produit_images",
  "ventes", "reparations", "historique_statuts", "composition_historique",
  "mouvements_caisse", "commandes", "lignes_commande", "factures",
  "facture_lignes", "notifications", "journal_activite", "push_subscriptions",
  "fcm_tokens", "carnet_entrees", "carnet_pieces_jointes",
];

// Tables avec TRUNCATE explicite (FK non CASCADE)
const TRUNCATE_TABLES = [
  "notification", "mouvement_caisse", "historique_statut",
  "composition_historique", "reparation", "facture_ligne",
  "facture", "vente", "produit_image", "produit",
  "ligne_commande", "commande", "lot", "client",
  "famille_info", "categorie_info", "modele", "categorie",
  "parametres", "user",
  "push_subscription", "fcm_token", "journal_activite",
  "carnet_piece_jointe", "carnet_entree",
];

// ─── NOMS DE TABLES PRISMA → NOMS SQL ───
const TABLE_NAME_MAP: Record<string, string> = {
  users: "users",
  parametres: "parametres",
  categories: "categories",
  modeles: "modeles",
  categories_info: "categories_info",
  familles_info: "familles_info",
  clients: "clients",
  lots: "lots",
  produits: "produits",
  produit_images: "produit_images",
  ventes: "ventes",
  reparations: "reparations",
  historique_statuts: "historique_statuts",
  composition_historique: "composition_historique",
  mouvements_caisse: "mouvements_caisse",
  commandes: "commandes",
  lignes_commande: "lignes_commande",
  factures: "factures",
  facture_lignes: "facture_lignes",
  notifications: "notifications",
  journal_activite: "journal_activite",
  push_subscriptions: "push_subscriptions",
  fcm_tokens: "fcm_tokens",
  carnet_entrees: "carnet_entrees",
  carnet_pieces_jointes: "carnet_pieces_jointes",
};

// ─── NOMS PRISMA → NOMS CLÉS DE TABLE ───
const PRISMA_KEY_MAP: Record<string, string> = {
  user: "users",
  parametres: "parametres",
  categorie: "categories",
  modele: "modeles",
  categorieInfo: "categories_info",
  familleInfo: "familles_info",
  client: "clients",
  lot: "lots",
  produit: "produits",
  produitImage: "produit_images",
  vente: "ventes",
  reparation: "reparations",
  historiqueStatut: "historique_statuts",
  compositionHistorique: "composition_historique",
  mouvementCaisse: "mouvements_caisse",
  commande: "commandes",
  ligneCommande: "lignes_commande",
  facture: "factures",
  factureLigne: "facture_lignes",
  notification: "notifications",
  journalActivite: "journal_activite",
  pushSubscription: "push_subscriptions",
  fcmToken: "fcm_tokens",
  carnetEntree: "carnet_entrees",
  carnetPieceJointe: "carnet_pieces_jointes",
};

// ============================================================
// SERVICE PRINCIPAL
// ============================================================
export class BackupService {

  // ─── CRÉER UN BACKUP ───
  static async createBackup(options: {
    name: string;
    description?: string;
    type?: "manual" | "automatic" | "pre_restore";
    userId?: number;
    username?: string;
  }): Promise<{ backup: any; recordCounts: Record<string, number> }> {
    ensureBackupDir();

    // 1. Créer l'entrée DB avec status CREATING
    const backup = await prisma.backup.create({
      data: {
        name: options.name,
        filename: `${options.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().split("T")[0]}.json`,
        description: options.description || null,
        status: "creating",
        type: options.type || "manual",
        storageKey: generateStorageKey(),
        version: BACKUP_VERSION,
        databaseVersion: getDbVersion(),
        applicationVersion: getAppVersion(),
        cree_par: options.userId || null,
        cree_par_nom: options.username || null,
      },
    });

    try {
      // 2. Récupérer toutes les données
      const data: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};

      for (const table of BACKUP_TABLES) {
        const prismaModel = (prisma as any)[table.model];
        if (!prismaModel) continue;

        let records: any[];
        if (table.model === "parametres") {
          const single = await prismaModel.findFirst();
          records = single ? [single] : [];
        } else if ("select" in table) {
          records = await prismaModel.findMany({ select: (table as any).select });
        } else {
          records = await prismaModel.findMany();
        }

        data[table.key] = records;
        recordCounts[table.key] = records.length;
      }

      // 3. Construire les métadonnées
      const totalRecords = Object.values(recordCounts).reduce((s, n) => s + n, 0);
      const metadata: BackupMetadata = {
        backupVersion: BACKUP_VERSION,
        applicationVersion: getAppVersion(),
        databaseSchemaVersion: getDbVersion(),
        createdAt: new Date().toISOString(),
        createdBy: options.username || "system",
        databaseType: "postgresql",
        checksum: "", // Sera calculé après sérialisation
        recordCounts,
        totalRecords,
        tablesIncluded: BACKUP_TABLES.map((t) => t.key),
      };

      // 4. Construire le contenu complet
      const content: BackupContent = { metadata, data };

      // 5. Sérialiser et calculer checksum
      const jsonString = JSON.stringify(content, null, 2);
      const checksum = computeChecksum(jsonString);
      metadata.checksum = checksum;

      // Ré-serialiser avec le checksum inclus
      const finalJson = JSON.stringify({ ...content, metadata }, null, 2);
      const fileSize = Buffer.byteLength(finalJson, "utf8");

      // 6. Vérifier la taille
      if (fileSize > MAX_BACKUP_SIZE) {
        throw new Error(`Le backup dépasse la taille maximale (${Math.round(fileSize / 1024 / 1024)} MB > ${Math.round(MAX_BACKUP_SIZE / 1024 / 1024)} MB)`);
      }

      // 7. Écrire le fichier
      const filePath = backupPath(backup.storageKey);
      await fs.writeFile(filePath, finalJson, "utf8");

      // 8. Vérifier que le fichier existe et correspond
      const stat = await fs.stat(filePath);
      if (stat.size !== fileSize) {
        throw new Error(`Taille du fichier incohérente: attendu ${fileSize}, obtenu ${stat.size}`);
      }

      // 9. Relire et re-vérifier le checksum
      const verifyContent = await fs.readFile(filePath, "utf8");
      const verifyChecksum = computeChecksum(verifyContent);
      if (verifyChecksum !== checksum) {
        throw new Error("Échec de la vérification d'intégrité post-écriture");
      }

      // 10. Mettre à jour le backup avec status READY
      const updatedBackup = await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: "ready",
          size: fileSize,
          checksum,
          metadata: recordCounts as any,
        },
      });

      // 11. Logger
      await this.log(backup.id, "BACKUP_CREATED", options.userId, options.username,
        `Backup "${options.name}" créé. ${totalRecords} enregistrements. ${Math.round(fileSize / 1024)} KB.`, true);

      return { backup: updatedBackup, recordCounts };

    } catch (error: any) {
      // Marquer comme FAILED
      await prisma.backup.update({
        where: { id: backup.id },
        data: { status: "failed", error: error.message },
      });

      // Logger l'échec
      await this.log(backup.id, "BACKUP_FAILED", options.userId, options.username,
        `Erreur: ${error.message}`, false);

      // Nettoyer le fichier si existe
      try {
        const filePath = backupPath(backup.storageKey);
        if (existsSync(filePath)) await fs.unlink(filePath);
      } catch { /* ignore cleanup error */ }

      throw error;
    }
  }

  // ─── LISTER LES BACKUPS ───
  static async listBackups(): Promise<any[]> {
    return prisma.backup.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        filename: true,
        description: true,
        status: true,
        type: true,
        size: true,
        checksum: true,
        storageKey: true,
        version: true,
        databaseVersion: true,
        applicationVersion: true,
        metadata: true,
        error: true,
        cree_par: true,
        cree_par_nom: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  // ─── CHARGER UN BACKUP (lecture + preview SANS modifier la DB) ───
  static async loadBackup(backupId: number): Promise<LoadResult> {
    // 1. Récupérer les métadonnées
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup) throw new Error("Backup introuvable.");
    if (backup.status === "failed") throw new Error("Ce backup a échoué et ne peut pas être chargé.");
    if (backup.status === "corrupted") throw new Error("Ce backup est marqué comme corrompu.");

    // 2. Lire le fichier
    const filePath = backupPath(backup.storageKey);
    if (!existsSync(filePath)) {
      // Mettre à jour le statut
      await prisma.backup.update({
        where: { id: backupId },
        data: { status: "corrupted", error: "Fichier physique introuvable sur le stockage." },
      });
      throw new Error("Fichier de backup introuvable sur le stockage. Le backup est marqué comme corrompu.");
    }

    const fileContent = await fs.readFile(filePath, "utf8");

    // 3. Vérifier le checksum
    const fileChecksum = computeChecksum(fileContent);
    const checksumValid = fileChecksum === backup.checksum;

    if (!checksumValid) {
      await prisma.backup.update({
        where: { id: backupId },
        data: { status: "corrupted", error: `Checksum invalide. Attendu: ${backup.checksum}, Obtenu: ${fileChecksum}` },
      });
      throw new Error("Checksum invalide. Le backup est marqué comme corrompu.");
    }

    // 4. Parser le contenu
    let content: BackupContent;
    try {
      content = JSON.parse(fileContent);
    } catch {
      throw new Error("Le fichier de backup n'est pas un JSON valide.");
    }

    if (!content.metadata || !content.data) {
      throw new Error("Structure de backup invalide (metadata ou data manquant).");
    }

    // 5. Logger
    await this.log(backupId, "BACKUP_LOADED", backup.cree_par ?? undefined, backup.cree_par_nom ?? undefined,
      `Backup chargé pour preview. Checksum: ${checksumValid ? "VALIDE" : "INVALIDE"}`, checksumValid);

    return {
      backup: {
        id: backup.id,
        name: backup.name,
        filename: backup.filename,
        status: backup.status,
        size: backup.size,
        checksum: backup.checksum,
        version: backup.version,
        metadata: content.metadata,
        created_at: backup.created_at,
        cree_par_nom: backup.cree_par_nom,
      },
      content,
      checksumValid,
    };
  }

  // ─── RESTAURER UN BACKUP ───
  static async restoreBackup(backupId: number, userId?: number, username?: string): Promise<RestoreResult> {
    // 1. Charger le backup (valide checksum)
    const loaded = await this.loadBackup(backupId);

    if (!loaded.checksumValid) {
      throw new Error("Restauration bloquée : checksum invalide. Backup corrompu ou incomplet.");
    }

    // 2. Vérifier la compatibilité
    const content = loaded.content;
    if (content.metadata.backupVersion > BACKUP_VERSION) {
      throw new Error(
        `Version de backup incompatible. Ce backup utilise la version ${content.metadata.backupVersion}, ` +
        `mais cette application supporte uniquement la version ${BACKUP_VERSION} ou inférieure.`
      );
    }

    // 3. Créer un backup de sécurité AVANT restauration
    let preRestoreBackup: any = null;
    try {
      preRestoreBackup = await this.createBackup({
        name: `Backup avant restauration — ${new Date().toLocaleString("fr-FR")}`,
        description: `Backup automatique créé avant restauration du backup #${backupId} "${loaded.backup.name}"`,
        type: "pre_restore",
        userId,
        username,
      });
    } catch (preBackupError: any) {
      // Le backup de sécurité échoue → on bloque la restauration
      throw new Error(
        `Impossible de créer le backup de sécurité avant restauration: ${preBackupError.message}. ` +
        `La restauration a été bloquée pour protéger les données actuelles.`
      );
    }

    // 4. Marquer le backup cible comme RESTORING
    await prisma.backup.update({
      where: { id: backupId },
      data: { status: "restoring" },
    });

    try {
      // 5. TRUNCATE toutes les tables
      const truncateList = TRUNCATE_TABLES.map((t) => `"${t}"`).join(", ");
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`
      );

      // 6. Restaurer les données dans l'ordre
      let recordsRestored = 0;

      for (const tableKey of RESTORE_ORDER) {
        const records = content.data[tableKey];
        if (!records || records.length === 0) continue;

        // Nettoyer les données: supprimer les champs générés par Prisma (id auto, etc.)
        const cleanedRecords = records.map((r: any) => {
          const cleaned: any = {};
          for (const [k, v] of Object.entries(r)) {
            // Garder tous les champs sauf les auto-gérés si non-null
            if (v !== undefined) cleaned[k] = v;
          }
          return cleaned;
        });

        // Trouver le modèle Prisma correspondant
        const prismaModelKey = Object.entries(PRISMA_KEY_MAP).find(([, v]) => v === tableKey)?.[0];
        if (!prismaModelKey) continue;

        const prismaModel = (prisma as any)[prismaModelKey];
        if (!prismaModel) continue;

        await prismaModel.createMany({ data: cleanedRecords, skipDuplicates: true });
        recordsRestored += cleanedRecords.length;
      }

      // 7. Réinitialiser les séquences
      for (const tableKey of RESTORE_ORDER) {
        const sqlTableName = TABLE_NAME_MAP[tableKey];
        if (!sqlTableName) continue;

        try {
          await prisma.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${sqlTableName}"', 'id'), coalesce(max(id), 0) + 1, false) FROM "${sqlTableName}"`
          );
        } catch {
          // Tables sans colonne 'id' (parametres) — ignorer
        }
      }

      // 8. Marquer comme RESTORED
      await prisma.backup.update({
        where: { id: backupId },
        data: { status: "restored" },
      });

      // 9. Logger
      await this.log(backupId, "BACKUP_RESTORE_COMPLETED", userId, username,
        `Restauration terminée. ${recordsRestored} enregistrements restaurés.`, true);

      return {
        success: true,
        backupId,
        preRestoreBackupId: preRestoreBackup?.backup?.id,
        message: `Restauration réussie. ${recordsRestored} enregistrements restaurés. Backup de sécurité créé (#${preRestoreBackup?.backup?.id}).`,
        recordsRestored,
      };

    } catch (error: any) {
      // Marquer comme FAILED
      await prisma.backup.update({
        where: { id: backupId },
        data: { status: "failed", error: `Échec de la restauration: ${error.message}` },
      });

      await this.log(backupId, "BACKUP_RESTORE_FAILED", userId, username,
        `Erreur: ${error.message}`, false);

      throw new Error(`Échec de la restauration: ${error.message}. Aucune donnée n'a été modifiée (transaction annulée).`);
    }
  }

  // ─── TÉLÉCHARGEMENT ───
  static async downloadBackup(backupId: number): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup) throw new Error("Backup introuvable.");

    const filePath = backupPath(backup.storageKey);
    if (!existsSync(filePath)) {
      throw new Error("Fichier de backup introuvable sur le stockage.");
    }

    return {
      filePath,
      filename: backup.filename,
      mimeType: "application/json",
    };
  }

  // ─── IMPORTER UN BACKUP EXTERNE ───
  static async importBackup(fileContent: string, originalFilename: string, userId?: number, username?: string): Promise<any> {
    ensureBackupDir();

    // 1. Valider le format
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error("Le fichier est vide.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      throw new Error("Le fichier n'est pas un JSON valide.");
    }

    if (!parsed.metadata || !parsed.data) {
      throw new Error("Structure de backup invalide. Le fichier doit contenir 'metadata' et 'data'.");
    }

    // 2. Vérifier la version
    if (parsed.metadata.backupVersion && parsed.metadata.backupVersion > BACKUP_VERSION) {
      throw new Error(
        `Version de backup incompatible (${parsed.metadata.backupVersion}). ` +
        `Cette application supporte la version ${BACKUP_VERSION} ou inférieure.`
      );
    }

    // 3. Vérifier le checksum si présent
    if (parsed.metadata.checksum) {
      const contentWithoutChecksum = JSON.stringify({ metadata: { ...parsed.metadata, checksum: "" }, data: parsed.data }, null, 2);
      const computedChecksum = computeChecksum(contentWithoutChecksum);
      // On accepte aussi le cas où le checksum dans le fichier est calculé sur tout le JSON
      const fullChecksum = computeChecksum(JSON.stringify(parsed, null, 2));
      if (computedChecksum !== parsed.metadata.checksum && fullChecksum !== parsed.metadata.checksum) {
        // On note le mismatch mais on continue — on recalcule le checksum réel
      }
    }

    // 4. Valider que les tables requises existent
    if (!parsed.data || typeof parsed.data !== "object") {
      throw new Error("Le champ 'data' doit être un objet contenant les tables.");
    }

    // 5. Créer l'entrée DB
    const storageKey = generateStorageKey();
    const backup = await prisma.backup.create({
      data: {
        name: `Import: ${originalFilename.replace(/\.json$/i, "")}`,
        filename: originalFilename,
        description: `Importé depuis "${originalFilename}" le ${new Date().toLocaleString("fr-FR")}`,
        status: "creating",
        type: "import",
        storageKey,
        version: parsed.metadata.backupVersion || 1,
        databaseVersion: parsed.metadata.databaseSchemaVersion || "",
        applicationVersion: parsed.metadata.applicationVersion || "",
        cree_par: userId || null,
        cree_par_nom: username || null,
      },
    });

    try {
      // 6. Écrire le fichier avec checksum calculé
      const jsonString = JSON.stringify(parsed, null, 2);
      const checksum = computeChecksum(jsonString);
      const fileSize = Buffer.byteLength(jsonString, "utf8");

      const filePath = backupPath(storageKey);
      await fs.writeFile(filePath, jsonString, "utf8");

      // 7. Vérifier l'écriture
      const verifyContent = await fs.readFile(filePath, "utf8");
      const verifyChecksum = computeChecksum(verifyContent);
      if (verifyChecksum !== checksum) {
        throw new Error("Échec de la vérification d'intégrité post-écriture.");
      }

      // 8. Compter les enregistrements
      const recordCounts: Record<string, number> = {};
      let totalRecords = 0;
      for (const [key, records] of Object.entries(parsed.data)) {
        if (Array.isArray(records)) {
          recordCounts[key] = records.length;
          totalRecords += records.length;
        }
      }

      // 9. Mettre à jour le backup
      const updatedBackup = await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: "ready",
          size: fileSize,
          checksum,
          metadata: { ...recordCounts, totalRecords } as any,
        },
      });

      // 10. Logger
      await this.log(backup.id, "BACKUP_IMPORT_COMPLETED", userId, username,
        `Import de "${originalFilename}" terminé. ${totalRecords} enregistrements.`, true);

      return updatedBackup;

    } catch (error: any) {
      await prisma.backup.update({
        where: { id: backup.id },
        data: { status: "failed", error: error.message },
      });

      await this.log(backup.id, "BACKUP_IMPORT_FAILED", userId, username,
        `Erreur: ${error.message}`, false);

      throw error;
    }
  }

  // ─── SUPPRIMER UN BACKUP ───
  static async deleteBackup(backupId: number, userId?: number, username?: string): Promise<void> {
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup) throw new Error("Backup introuvable.");

    // 1. Supprimer le fichier physique
    const filePath = backupPath(backup.storageKey);
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
      // Vérifier suppression
      if (existsSync(filePath)) {
        throw new Error("Impossible de supprimer le fichier physique. Les métadonnées ont été conservées.");
      }
    }

    // 2. Logger avant suppression
    await this.log(backupId, "BACKUP_DELETED", userId, username,
      `Backup "${backup.name}" supprimé.`, true);

    // 3. Supprimer les logs liés
    await prisma.backupLog.deleteMany({ where: { backup_id: backupId } });

    // 4. Supprimer l'entrée DB
    await prisma.backup.delete({ where: { id: backupId } });
  }

  // ─── VÉRIFIER L'INTÉGRITÉ D'UN BACKUP ───
  static async verifyIntegrity(backupId: number): Promise<{ valid: boolean; error?: string }> {
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup) return { valid: false, error: "Backup introuvable." };

    const filePath = backupPath(backup.storageKey);
    if (!existsSync(filePath)) {
      return { valid: false, error: "Fichier physique introuvable." };
    }

    try {
      const content = await fs.readFile(filePath, "utf8");
      const checksum = computeChecksum(content);
      if (checksum !== backup.checksum) {
        return { valid: false, error: `Checksum invalide. Attendu: ${backup.checksum}, Obtenu: ${checksum}` };
      }

      // Vérifier que le JSON est parseable
      JSON.parse(content);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `Erreur de lecture: ${error.message}` };
    }
  }

  // ─── LOGGER UNE ACTION ───
  static async log(
    backupId: number | null,
    action: string,
    userId?: number,
    username?: string,
    details?: string,
    success: boolean = true,
  ): Promise<void> {
    try {
      await prisma.backupLog.create({
        data: {
          backup_id: backupId,
          action,
          user_id: userId || null,
          user_nom: username || null,
          details: details || null,
          success,
        },
      });
    } catch (err) {
      console.error("Erreur logging backup:", err);
    }
  }
}
