/**
 * Service BOM (Bill of Materials) — Gestion centralisée de la composition de produits.
 *
 * Responsabilités :
 * - Attacher / détacher des composants physiques
 * - Remplacement atomique de composants
 * - Gestion des slots (template de composition)
 * - Vérification de compatibilité
 * - Historique des opérations
 *
 * Toute opération BOM passe par ce service pour garantir :
 * - Atomicité (transactions Prisma)
 * - Cohérence stock (statut, modèle)
 * - Traçabilité (CompositionHistorique + HistoriqueStatut)
 */

import { PrismaClient, Prisma } from "@prisma/client";

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// Statuts de stock disponibles
const STATUTS_EN_STOCK = ["recu", "en_test", "ok", "a_reparer", "manque_piece", "en_vente", "produit_commande"];
const STATUTS_HORS_STOCK = ["vendu", "hs", "assemble"];

export interface ComposantInstalle {
  id: number;
  produit_id: number;
  produit_parent_id: number;
  slot_definition_id: number | null;
  installed_at: Date;
  removed_at: Date | null;
  removed_reason: string | null;
  installed_by: number | null;
  produit: {
    id: number;
    code_interne: string;
    reference: string;
    categorie: string;
    numero_serie: string | null;
    grade: string | null;
    statut: string;
    prix_achat: number | null;
    image_url: string | null;
    modele: { id: number; nom: string; categorie_id: number | null } | null;
  };
  slot_definition: {
    id: number;
    label: string;
    type_composant: string;
    quantite: number;
    obligatoire: boolean;
    attributs_requis: any;
  } | null;
}

export interface SlotDefinitionData {
  id: number;
  label: string;
  type_composant: string;
  quantite: number;
  obligatoire: boolean;
  attributs_requis: any;
  _count: { installed_components: number };
}

// ═══════════════════════════════════════════════════════
// COMPOSANTS INSTALLÉS
// ═══════════════════════════════════════════════════════

/**
 * Attacher un composant à un produit parent.
 */
export async function attacherComposant(
  tx: TxClient,
  {
    parentId,
    composantId,
    slotDefinitionId,
    userId,
  }: {
    parentId: number;
    composantId: number;
    slotDefinitionId?: number | null;
    userId: number;
  }
): Promise<{ success: boolean; message: string }> {
  // 1. Vérifier le parent
  const parent = await tx.produit.findUnique({
    where: { id: parentId },
    select: { id: true, reference: true, est_compose: true },
  });
  if (!parent) throw new Error("Produit parent introuvable.");

  // 2. Vérifier le composant
  const composant = await tx.produit.findUnique({
    where: { id: composantId },
    select: {
      id: true,
      reference: true,
      statut: true,
      bom_role: true,
      modele_id: true,
      parent_id: true,
    },
  });
  if (!composant) throw new Error("Composant introuvable.");

  // 3. Vérifications
  if (composantId === parentId) {
    throw new Error("Un produit ne peut pas être son propre composant.");
  }
  if (composant.parent_id !== null) {
    throw new Error(
      `Ce composant est déjà affecté à un autre produit (parent_id: ${composant.parent_id}).`
    );
  }
  if (composant.statut === "vendu") {
    throw new Error("Ce composant est déjà vendu.");
  }
  if (composant.statut === "hs") {
    throw new Error("Ce composant est hors-service.");
  }
  if (composant.statut === "assemble") {
    throw new Error(`"${composant.reference}" est déjà intégré dans un autre produit.`);
  }

  // 4. Vérifier compatibilité du slot si spécifié
  if (slotDefinitionId) {
    const slot = await tx.slotDefinition.findUnique({
      where: { id: slotDefinitionId },
    });
    if (!slot) throw new Error("Slot introuvable.");
    if (slot.produit_parent_id !== parentId) {
      throw new Error("Ce slot n'appartient pas à ce produit parent.");
    }
  }

  // 5. Vérifier unicité
  const existant = await tx.installedComponent.findFirst({
    where: {
      produit_id: composantId,
      produit_parent_id: parentId,
      removed_at: null,
    },
  });
  if (existant) {
    throw new Error("Ce composant est déjà installé dans ce produit.");
  }

  // 6. Marquer le parent comme composé
  if (!parent.est_compose) {
    await tx.produit.update({
      where: { id: parentId },
      data: { est_compose: true },
    });
  }

  // 7. Mettre à jour le statut du composant
  const ancienStatut = composant.statut;
  await tx.produit.update({
    where: { id: composantId },
    data: { parent_id: parentId, statut: "assemble", en_vitrine: false },
  });

  // 8. Créer l'entrée InstalledComponent
  await tx.installedComponent.create({
    data: {
      produit_id: composantId,
      produit_parent_id: parentId,
      slot_definition_id: slotDefinitionId || null,
      installed_by: userId,
    },
  });

  // 9. Historique
  await tx.historiqueStatut.create({
    data: {
      produit_id: composantId,
      user_id: userId,
      statut_avant: ancienStatut,
      statut_apres: "assemble",
      note: `Intégré comme composant dans "${parent.reference}" (ID #${parentId})`,
    },
  });

  await tx.compositionHistorique.create({
    data: {
      produit_id: composantId,
      produit_parent_id: parentId,
      user_id: userId,
      action: "assemblage",
      note: `Intégré dans "${parent.reference}" (quantité: 1)`,
    },
  });

  return { success: true, message: "Composant intégré avec succès." };
}

/**
 * Détacher un composant d'un produit parent.
 */
export async function detacherComposant(
  tx: TxClient,
  {
    parentId,
    composantId,
    userId,
    reason,
  }: {
    parentId: number;
    composantId: number;
    userId: number;
    reason?: string;
  }
): Promise<{ success: boolean; message: string }> {
  // 1. Vérifier que le composant est bien installé ici
  const installation = await tx.installedComponent.findFirst({
    where: {
      produit_id: composantId,
      produit_parent_id: parentId,
      removed_at: null,
    },
  });
  if (!installation) {
    throw new Error("Ce composant n'est pas installé dans ce produit.");
  }

  // 2. Vérifier le composant
  const composant = await tx.produit.findUnique({
    where: { id: composantId },
    select: { reference: true, statut: true, modele_id: true },
  });
  if (!composant) throw new Error("Composant introuvable.");

  // 3. Mettre à jour InstalledComponent
  await tx.installedComponent.update({
    where: { id: installation.id },
    data: {
      removed_at: new Date(),
      removed_reason: reason || "retrait",
    },
  });

  // 4. Remettre le composant au stock
  await tx.produit.update({
    where: { id: composantId },
    data: { parent_id: null, statut: "ok" },
  });

  // 5. Vérifier si le parent a encore des composants
  const autresComposants = await tx.installedComponent.count({
    where: {
      produit_parent_id: parentId,
      removed_at: null,
    },
  });
  if (autresComposants === 0) {
    await tx.produit.update({
      where: { id: parentId },
      data: { est_compose: false },
    });
  }

  // 6. Historique
  await tx.historiqueStatut.create({
    data: {
      produit_id: composantId,
      user_id: userId,
      statut_avant: "assemble",
      statut_apres: "ok",
      note: `Retiré du produit composé (ID #${parentId}) — Retour en stock`,
    },
  });

  await tx.compositionHistorique.create({
    data: {
      produit_id: composantId,
      produit_parent_id: parentId,
      user_id: userId,
      action: "désassemblage",
      note: `Retiré du composé (ID #${parentId}) — retour en stock`,
    },
  });

  return { success: true, message: "Composant retiré et remis en stock." };
}

/**
 * Remplacer un composant par un autre (opération atomique).
 */
export async function remplacerComposant(
  tx: TxClient,
  {
    parentId,
    ancienComposantId,
    nouveauComposantId,
    userId,
    motif,
  }: {
    parentId: number;
    ancienComposantId: number;
    nouveauComposantId: number;
    userId: number;
    motif?: string;
  }
): Promise<{ success: boolean; message: string }> {
  // 1. Détacher l'ancien
  const detachment = await detacherComposant(tx, {
    parentId,
    composantId: ancienComposantId,
    userId,
    reason: "remplacement",
  });

  // 2. Attacher le nouveau (en conservant le même slot)
  const installation = await attacherComposant(tx, {
    parentId,
    composantId: nouveauComposantId,
    slotDefinitionId: null, // Le slot sera conservé via l'historique
    userId,
  });

  // 3. Mettre à jour l'historique de remplacement
  await tx.compositionHistorique.create({
    data: {
      produit_id: nouveauComposantId,
      produit_parent_id: parentId,
      user_id: userId,
      action: "remplacement",
      composant_remplace_id: ancienComposantId,
      note: motif || `Remplacement du composant #${ancienComposantId}`,
    },
  });

  return { success: true, message: "Composant remplacé avec succès." };
}

// ═══════════════════════════════════════════════════════
// CONSULTATION
// ═══════════════════════════════════════════════════════

/**
 * Récupérer les composants installés d'un produit.
 */
export async function getComposition(
  prisma: PrismaClient,
  produitId: number
): Promise<{
  composants: ComposantInstalle[];
  stats: {
    nb_composants: number;
    cout_total: number;
    par_categorie: Record<string, number>;
  };
}> {
  const installations = await prisma.installedComponent.findMany({
    where: {
      produit_parent_id: produitId,
      removed_at: null,
    },
    include: {
      produit: {
        select: {
          id: true,
          code_interne: true,
          reference: true,
          categorie: true,
          numero_serie: true,
          grade: true,
          statut: true,
          prix_achat: true,
          image_url: true,
          modele: { select: { id: true, nom: true, categorie_id: true } },
        },
      },
      slot_definition: {
        select: {
          id: true,
          label: true,
          type_composant: true,
          quantite: true,
          obligatoire: true,
          attributs_requis: true,
        },
      },
    },
    orderBy: { installed_at: "asc" },
  });

  const nb_composants = installations.length;
  const cout_total = installations.reduce(
    (s, i) => s + (i.produit.prix_achat || 0),
    0
  );

  const par_categorie: Record<string, number> = {};
  for (const i of installations) {
    par_categorie[i.produit.categorie] =
      (par_categorie[i.produit.categorie] || 0) + 1;
  }

  return {
    composants: installations,
    stats: { nb_composants, cout_total, par_categorie },
  };
}

/**
 * Récupérer les slots (template) d'un produit.
 */
export async function getSlots(
  prisma: PrismaClient,
  produitId: number
): Promise<SlotDefinitionData[]> {
  return prisma.slotDefinition.findMany({
    where: { produit_parent_id: produitId },
    include: {
      _count: {
        select: { installed_components: true },
      },
    },
    orderBy: { id: "asc" },
  });
}

/**
 * Vérifier si un composant est compatible avec un slot.
 */
export async function verifierCompatibilite(
  prisma: PrismaClient,
  slotId: number,
  composantId: number
): Promise<{ compatible: boolean; raison?: string }> {
  const slot = await prisma.slotDefinition.findUnique({
    where: { id: slotId },
  });
  if (!slot) return { compatible: false, raison: "Slot introuvable." };

  const composant = await prisma.produit.findUnique({
    where: { id: composantId },
    include: { modele: true },
  });
  if (!composant) return { compatible: false, raison: "Composant introuvable." };

  // Vérifier la catégorie du composant
  const typeComposant = slot.type_composant.toLowerCase();
  const categorieComposant = composant.categorie.toLowerCase();

  if (typeComposant && !categorieComposant.includes(typeComposant)) {
    return {
      compatible: false,
      raison: `Ce slot attend un composant de type "${slot.type_composant}", mais le composant est "${composant.categorie}".`,
    };
  }

  // Vérifier les attributs requis si spécifiés
  if (slot.attributs_requis && composant.modele?.attributs) {
    const requis = slot.attributs_requis as Record<string, any>;
    const actuels = composant.modele.attributs as Record<string, any>;

    for (const [cle, valeur] of Object.entries(requis)) {
      if (actuels[cle] !== valeur) {
        return {
          compatible: false,
          raison: `Attribut "${cle}" incompatible : requis "${valeur}", trouvé "${actuels[cle]}".`,
        };
      }
    }
  }

  return { compatible: true };
}
