"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/toast";
import Modale from "@/components/Modale";
import {
  IconeBaseDeDonnees,
  IconeTelechargement,
  IconeCorbeille,
  IconeActualiser,
  IconeImport,
  IconeAlerte,
  IconeCoche,
  IconeInfo,
  IconeRetablir,
} from "@/components/icons";

// ─── TYPES ───
interface BackupEntry {
  id: number;
  name: string;
  filename: string;
  description: string | null;
  status: string;
  type: string;
  size: number;
  checksum: string;
  storageKey: string;
  version: number;
  metadata: Record<string, number> | null;
  error: string | null;
  cree_par: number | null;
  cree_par_nom: string | null;
  created_at: string;
  updated_at: string;
}

interface PreviewData {
  backup: any;
  checksumValid: boolean;
  preview: {
    recordCounts: Record<string, number>;
    totalRecords: number;
    tablesIncluded: string[];
    applicationVersion: string;
    databaseSchemaVersion: string;
    createdAt: string;
  };
}

interface Props {
  user: { id: number; username: string; role: string };
}

// ─── HELPERS ───
function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function formaterDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUT_LABELS: Record<string, { label: string; cls: string }> = {
  ready: { label: "Prêt", cls: "bg-green-50 text-green-700 border-green-200" },
  creating: { label: "Création…", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  validating: { label: "Validation…", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  restoring: { label: "Restauration…", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  restored: { label: "Restauré", cls: "bg-green-50 text-green-700 border-green-200" },
  failed: { label: "Échoué", cls: "bg-red-50 text-red-700 border-red-200" },
  corrupted: { label: "Corrompu", cls: "bg-red-50 text-red-700 border-red-200" },
};

const TYPE_LABELS: Record<string, string> = {
  manual: "Manuel",
  automatic: "Auto",
  pre_restore: "Pré-restore",
  import: "Import",
};

// ─── NOMS DE TABLES LISIBLES ───
const TABLE_LABELS: Record<string, string> = {
  users: "Utilisateurs",
  parametres: "Paramètres",
  categories: "Catégories",
  modeles: "Modèles",
  categories_info: "Info catégories",
  familles_info: "Info familles",
  clients: "Clients",
  lots: "Lots",
  produits: "Produits",
  produit_images: "Images produits",
  ventes: "Ventes",
  reparations: "Réparations",
  historique_statuts: "Historique statuts",
  composition_historique: "Historique BOM",
  mouvements_caisse: "Mouvements caisse",
  commandes: "Commandes",
  lignes_commande: "Lignes commande",
  factures: "Factures",
  facture_lignes: "Lignes facture",
  notifications: "Notifications",
  journal_activite: "Journal activité",
  push_subscriptions: "Push subscriptions",
  fcm_tokens: "Tokens FCM",
  carnet_entrees: "Carnet entrées",
  carnet_pieces_jointes: "Pièces jointes",
};

// ─── COMPOSANT PRINCIPAL ───
export default function BackupClient({ user }: Props) {
  const { afficher } = useToast();

  // État
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [chargement, setChargement] = useState(true);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [nomBackup, setNomBackup] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Modales
  const [modalPreview, setModalPreview] = useState<PreviewData | null>(null);
  const [modalRestore, setModalRestore] = useState<BackupEntry | null>(null);
  const [modalDelete, setModalDelete] = useState<BackupEntry | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [actionEnCours, setActionEnCours] = useState(false);

  // ─── CHARGER LA LISTE ───
  const chargerBackups = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/backup");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setBackups(body.backups || []);
    } catch (e: any) {
      afficher(e.message || "Erreur de chargement", "erreur");
    } finally {
      setChargement(false);
    }
  }, [afficher]);

  useEffect(() => { chargerBackups(); }, [chargerBackups]);

  // ─── CRÉER UN BACKUP ───
  const handleCreer = async () => {
    setCreationEnCours(true);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nomBackup || `Backup du ${new Date().toLocaleDateString("fr-FR")}`,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      afficher(`Backup créé : ${body.backup.name} (${formaterTaille(body.backup.size)})`, "succes");
      setNomBackup("");
      chargerBackups();
    } catch (e: any) {
      afficher(e.message || "Erreur de création", "erreur");
    } finally {
      setCreationEnCours(false);
    }
  };

  // ─── CHARGER / PRÉVISUALISER ───
  const handleLoad = async (backup: BackupEntry) => {
    setActionEnCours(true);
    try {
      const res = await fetch(`/api/admin/backup/${backup.id}/load`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setModalPreview(body);
    } catch (e: any) {
      afficher(e.message || "Erreur de chargement", "erreur");
    } finally {
      setActionEnCours(false);
    }
  };

  // ─── TÉLÉCHARGEMENT ───
  const handleDownload = async (backup: BackupEntry) => {
    try {
      const res = await fetch(`/api/admin/backup/${backup.id}/download`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Erreur");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      afficher(e.message || "Erreur de téléchargement", "erreur");
    }
  };

  // ─── RESTAURER ───
  const handleRestore = async () => {
    if (!modalRestore || confirmText !== "RESTAURER") return;
    setActionEnCours(true);
    try {
      const res = await fetch(`/api/admin/backup/${modalRestore.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "RESTAURER" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      afficher(body.message, "succes");
      setModalRestore(null);
      setConfirmText("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      afficher(e.message || "Erreur de restauration", "erreur");
    } finally {
      setActionEnCours(false);
    }
  };

  // ─── SUPPRIMER ───
  const handleDelete = async () => {
    if (!modalDelete) return;
    setActionEnCours(true);
    try {
      const res = await fetch(`/api/admin/backup/${modalDelete.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      afficher("Backup supprimé.", "succes");
      setModalDelete(null);
      chargerBackups();
    } catch (e: any) {
      afficher(e.message || "Erreur de suppression", "erreur");
    } finally {
      setActionEnCours(false);
    }
  };

  // ─── IMPORTER ───
  const handleImport = async () => {
    if (!importFile) return;
    setImportEnCours(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await fetch("/api/admin/backup/import", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      afficher(`Import réussi : ${body.backup.name}`, "succes");
      setImportFile(null);
      if (importRef.current) importRef.current.value = "";
      chargerBackups();
    } catch (e: any) {
      afficher(e.message || "Erreur d'import", "erreur");
    } finally {
      setImportEnCours(false);
    }
  };

  // ─── RENDU ───
  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Sauvegardes</h1>
          <p className="text-xs text-brand-warm-grey">
            Créer, charger, restaurer et importer des sauvegardes de la base de données.
          </p>
        </div>
        <button
          onClick={chargerBackups}
          disabled={chargement}
          className="btn btn-secondaire text-sm self-start"
        >
          <IconeActualiser taille={14} />
          Actualiser
        </button>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 bg-brand-paper border border-brand-light-grey rounded-lg">
        {/* Créer */}
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            value={nomBackup}
            onChange={(e) => setNomBackup(e.target.value)}
            placeholder="Nom du backup (optionnel)"
            className="champ text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCreer()}
          />
          <button
            onClick={handleCreer}
            disabled={creationEnCours}
            className="btn btn-primaire text-sm whitespace-nowrap"
          >
            {creationEnCours ? (
              <span className="animate-pulse">Création…</span>
            ) : (
              <>
                <IconeBaseDeDonnees taille={14} />
                Créer
              </>
            )}
          </button>
        </div>

        <div className="hidden sm:block w-px bg-brand-light-grey" />

        {/* Importer */}
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            ref={importRef}
            className="hidden"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => importRef.current?.click()}
            className="btn btn-secondaire text-sm whitespace-nowrap"
          >
            <IconeImport taille={14} />
            Importer
          </button>
          {importFile && (
            <button
              onClick={handleImport}
              disabled={importEnCours}
              className="btn btn-primaire text-sm whitespace-nowrap"
            >
              {importEnCours ? "Import…" : `Importer ${importFile.name}`}
            </button>
          )}
        </div>
      </div>

      {/* Tableau des backups */}
      <div className="border border-brand-light-grey rounded-lg overflow-hidden">
        {chargement ? (
          <div className="p-8 text-center text-sm text-brand-warm-grey animate-pulse">
            Chargement…
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-sm text-brand-warm-grey">
            Aucune sauvegarde. Créez votre première sauvegarde pour sécuriser vos données.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-paper border-b border-brand-light-grey text-left text-xs text-brand-warm-grey uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium">Nom</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Taille</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">État</th>
                  <th className="px-3 py-2 font-medium">Intégrité</th>
                  <th className="px-3 py-2 font-medium">Créé par</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-grey/50">
                {backups.map((b) => {
                  const statut = STATUT_LABELS[b.status] ?? { label: b.status, cls: "bg-gray-50 text-gray-700 border-gray-200" };
                  return (
                    <tr key={b.id} className="hover:bg-brand-paper/50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-medium text-brand-black truncate max-w-[200px]">{b.name}</div>
                        {b.description && (
                          <div className="text-xs text-brand-warm-grey truncate max-w-[200px]">{b.description}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-brand-smooth whitespace-nowrap">
                        {formaterDate(b.created_at)}
                      </td>
                      <td className="px-3 py-2 text-xs text-brand-smooth whitespace-nowrap">
                        {formaterTaille(b.size)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-brand-warm-grey">{TYPE_LABELS[b.type] || b.type}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statut.cls}`}>
                          {statut.label}
                        </span>
                        {b.error && (
                          <div className="text-xs text-red-500 mt-0.5 max-w-[150px] truncate" title={b.error}>
                            {b.error}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {b.status === "ready" || b.status === "restored" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <IconeCoche taille={12} />
                            SHA-256
                          </span>
                        ) : b.status === "corrupted" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <IconeAlerte taille={12} />
                            Invalide
                          </span>
                        ) : (
                          <span className="text-xs text-brand-warm-grey">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-brand-warm-grey">
                        {b.cree_par_nom || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {(b.status === "ready" || b.status === "restored") && (
                            <>
                              <button
                                onClick={() => handleLoad(b)}
                                disabled={actionEnCours}
                                className="p-1.5 rounded hover:bg-brand-light-grey/50 text-brand-crystal transition-colors"
                                title="Charger / Prévisualiser"
                              >
                                <IconeInfo taille={14} />
                              </button>
                              <button
                                onClick={() => handleDownload(b)}
                                className="p-1.5 rounded hover:bg-brand-light-grey/50 text-brand-smooth transition-colors"
                                title="Télécharger"
                              >
                                <IconeTelechargement taille={14} />
                              </button>
                              <button
                                onClick={() => { setModalRestore(b); setConfirmText(""); }}
                                className="p-1.5 rounded hover:bg-brand-light-grey/50 text-amber-600 transition-colors"
                                title="Restaurer"
                              >
                                <IconeRetablir taille={14} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setModalDelete(b)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                            title="Supprimer"
                          >
                            <IconeCorbeille taille={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats résumé */}
      {backups.length > 0 && (
        <div className="flex gap-4 text-xs text-brand-warm-grey">
          <span>{backups.length} backup{backups.length > 1 ? "s" : ""}</span>
          <span>•</span>
          <span>{backups.filter((b) => b.status === "ready").length} prêt(s)</span>
          <span>•</span>
          <span>{backups.filter((b) => b.status === "failed" || b.status === "corrupted").length} problème(s)</span>
        </div>
      )}

      {/* ─── MODALE: PRÉVISUALISATION ─── */}
      <Modale
        ouverte={!!modalPreview}
        onFermer={() => { setModalPreview(null); setConfirmText(""); }}
        titre="Détails du backup"
        large
      >
        {modalPreview && (
          <div className="space-y-4">
            {/* En-tête */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-brand-black">{modalPreview.backup.name}</h3>
                <p className="text-xs text-brand-warm-grey">
                  {formaterDate(modalPreview.backup.created_at)} — v{modalPreview.backup.version}
                </p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                modalPreview.checksumValid
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {modalPreview.checksumValid ? "✓ Checksum valide" : "✗ Checksum invalide"}
              </span>
            </div>

            {/* Métadonnées */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2 bg-brand-paper rounded border border-brand-light-grey">
                <div className="text-xs text-brand-warm-grey">Total</div>
                <div className="font-bold text-brand-black">{modalPreview.preview.totalRecords.toLocaleString("fr-FR")}</div>
              </div>
              <div className="p-2 bg-brand-paper rounded border border-brand-light-grey">
                <div className="text-xs text-brand-warm-grey">Taille</div>
                <div className="font-bold text-brand-black">{formaterTaille(modalPreview.backup.size)}</div>
              </div>
              <div className="p-2 bg-brand-paper rounded border border-brand-light-grey">
                <div className="text-xs text-brand-warm-grey">Tables</div>
                <div className="font-bold text-brand-black">{modalPreview.preview.tablesIncluded.length}</div>
              </div>
              <div className="p-2 bg-brand-paper rounded border border-brand-light-grey">
                <div className="text-xs text-brand-warm-grey">Version DB</div>
                <div className="font-bold text-brand-black text-xs truncate" title={modalPreview.preview.databaseSchemaVersion}>
                  {modalPreview.preview.databaseSchemaVersion || "—"}
                </div>
              </div>
            </div>

            {/* Détail par table */}
            <div>
              <h4 className="text-xs font-semibold text-brand-warm-grey uppercase tracking-wider mb-2">
                Enregistrements par table
              </h4>
              <div className="border border-brand-light-grey rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-brand-paper border-b border-brand-light-grey">
                      <th className="px-2 py-1.5 text-left font-medium text-brand-warm-grey">Table</th>
                      <th className="px-2 py-1.5 text-right font-medium text-brand-warm-grey">Enregistrements</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-light-grey/50">
                    {Object.entries(modalPreview.preview.recordCounts)
                      .filter(([, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, count]) => (
                        <tr key={key} className="hover:bg-brand-paper/50">
                          <td className="px-2 py-1.5 text-brand-smooth">{TABLE_LABELS[key] || key}</td>
                          <td className="px-2 py-1.5 text-right font-medium text-brand-black">{count.toLocaleString("fr-FR")}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Checksum */}
            <div className="p-2 bg-brand-paper rounded border border-brand-light-grey">
              <div className="text-xs text-brand-warm-grey mb-1">SHA-256</div>
              <code className="text-xs text-brand-smooth font-mono break-all">{modalPreview.backup.checksum}</code>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-brand-light-grey">
              <button
                onClick={() => handleDownload(modalPreview.backup)}
                className="btn btn-secondaire text-sm"
              >
                <IconeTelechargement taille={14} />
                Télécharger
              </button>
              <button
                onClick={() => {
                  setModalRestore(modalPreview!.backup);
                  setModalPreview(null);
                  setConfirmText("");
                }}
                className="btn bg-amber-500 hover:bg-amber-600 text-white text-sm"
              >
                <IconeRetablir taille={14} />
                Restaurer ce backup
              </button>
            </div>
          </div>
        )}
      </Modale>

      {/* ─── MODALE: RESTAURATION ─── */}
      <Modale
        ouverte={!!modalRestore}
        onFermer={() => { if (!actionEnCours) { setModalRestore(null); setConfirmText(""); } }}
        titre="Restaurer ce backup"
      >
        {modalRestore && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <p className="font-semibold mb-1">Attention : Cette action modifie les données.</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Un backup de sécurité sera automatiquement créé avant la restauration.</li>
                <li>Toutes les données actuelles seront remplacées par celles du backup.</li>
                <li>Vous serez déconnecté si votre utilisateur est différent dans le backup.</li>
              </ul>
            </div>

            <div className="p-3 bg-brand-paper border border-brand-light-grey rounded text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-brand-warm-grey">Backup :</span>
                <span className="font-medium text-brand-black">{modalRestore.name}</span>
                <span className="text-brand-warm-grey">Date :</span>
                <span className="text-brand-black">{formaterDate(modalRestore.created_at)}</span>
                <span className="text-brand-warm-grey">Taille :</span>
                <span className="text-brand-black">{formaterTaille(modalRestore.size)}</span>
                <span className="text-brand-warm-grey">Intégrité :</span>
                <span className="text-green-600 font-medium">SHA-256 validé</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-brand-warm-grey block mb-1">
                Tapez <strong>RESTAURER</strong> pour confirmer :
              </label>
              <input
                type="text"
                className="champ w-full text-center font-bold"
                placeholder="RESTAURER"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={actionEnCours}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setModalRestore(null); setConfirmText(""); }}
                className="btn btn-secondaire text-sm"
                disabled={actionEnCours}
              >
                Annuler
              </button>
              <button
                onClick={handleRestore}
                disabled={confirmText !== "RESTAURER" || actionEnCours}
                className="btn bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50"
              >
                {actionEnCours ? "Restauration…" : "Confirmer et restaurer"}
              </button>
            </div>
          </div>
        )}
      </Modale>

      {/* ─── MODALE: SUPPRESSION ─── */}
      <Modale
        ouverte={!!modalDelete}
        onFermer={() => { if (!actionEnCours) setModalDelete(null); }}
        titre="Supprimer le backup"
      >
        {modalDelete && (
          <div className="space-y-4">
            <p className="text-sm text-brand-smooth">
              Supprimer le backup <strong>{modalDelete.name}</strong> ?
            </p>
            <p className="text-xs text-brand-warm-grey">
              Cette action est irréversible. Le fichier physique sera supprimé du stockage.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalDelete(null)}
                className="btn btn-secondaire text-sm"
                disabled={actionEnCours}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={actionEnCours}
                className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
              >
                {actionEnCours ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        )}
      </Modale>
    </div>
  );
}
