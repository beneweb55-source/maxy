import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { estEligibleOverrideVente } from "@/lib/state-machine";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    const code = params.get("code") || params.get("q") || params.get("scan_code");

    if (!code || !code.trim()) {
      return erreur(400, "Veuillez fournir un code à scanner.");
    }

    const codeNettoye = code.trim();

    // Recherche par code interne (ex: PC-001) ou par numéro de série (S/N)
    const produit = await prisma.produit.findFirst({
      where: {
        OR: [
          { code_interne: { equals: codeNettoye, mode: "insensitive" } },
          { numero_serie: { equals: codeNettoye, mode: "insensitive" } },
        ],
      },
      include: {
        reparations: { select: { cout: true } },
        lot: { select: { id: true, fournisseur: true, date_entree: true } },
      },
    });

    if (!produit) {
      return erreur(404, `Aucun équipement trouvé pour le code « ${codeNettoye} ».`);
    }

    // 1. Cas Bloqué : Produit Hors Service, Déjà Vendu ou Déjà Réservé sur commande
    if (produit.statut === "hs") {
      return NextResponse.json(
        { 
          error: `L'exemplaire ${produit.code_interne} est Hors Service (HS) et ne peut pas être vendu.`,
          statutActuel: produit.statut,
          bloque: true,
          produit 
        },
        { status: 400 }
      );
    }

    if (produit.statut === "vendu") {
      return NextResponse.json(
        { 
          error: `L'exemplaire ${produit.code_interne} a déjà été vendu et facturé.`,
          statutActuel: produit.statut,
          bloque: true,
          produit 
        },
        { status: 400 }
      );
    }

    if (produit.statut === "produit_commande") {
      return NextResponse.json(
        { 
          error: `L'exemplaire ${produit.code_interne} est actuellement réservé sur une commande client.`,
          statutActuel: produit.statut,
          bloque: true,
          produit 
        },
        { status: 400 }
      );
    }

    // 2. Cas Normal : Produit déjà en vente
    if (produit.statut === "en_vente") {
      return NextResponse.json({
        requiresOverride: false,
        statutActuel: "en_vente",
        prix: produit.prix_vente_fixe ?? produit.prix_vente_reel ?? 0,
        produit: {
          id: produit.id,
          code_interne: produit.code_interne,
          reference: produit.reference,
          categorie: produit.categorie,
          numero_serie: produit.numero_serie,
          grade: produit.grade,
          emplacement: produit.emplacement,
          statut: produit.statut,
          prix_achat: produit.prix_achat,
          prix_vente_fixe: produit.prix_vente_fixe,
          prix_vente_reel: produit.prix_vente_reel,
          etiquette_imprimee: produit.etiquette_imprimee,
        },
      });
    }

    // 3. Cas Auto-Correction / Override au Comptoir (Statuts atelier : recu, en_test, ok, a_reparer, manque_piece)
    if (estEligibleOverrideVente(produit.statut)) {
      return NextResponse.json({
        requiresOverride: true,
        statutActuel: produit.statut,
        prix: produit.prix_vente_fixe ?? produit.prix_vente_reel ?? (produit.prix_achat > 0 ? Math.round(produit.prix_achat * 1.25) : 0),
        produit: {
          id: produit.id,
          code_interne: produit.code_interne,
          reference: produit.reference,
          categorie: produit.categorie,
          numero_serie: produit.numero_serie,
          grade: produit.grade,
          emplacement: produit.emplacement,
          statut: produit.statut,
          prix_achat: produit.prix_achat,
          prix_vente_fixe: produit.prix_vente_fixe,
          prix_vente_reel: produit.prix_vente_reel,
          etiquette_imprimee: produit.etiquette_imprimee,
        },
      });
    }

    return erreur(400, `Statut incompatible : ${produit.statut}`);
  } catch (e: any) {
    console.error("GET /api/scan error:", e);
    return erreur(500, e?.message || "Erreur lors du scan de l'équipement.");
  }
}
