import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import type { StatutCommande, TypePaiement } from "@prisma/client";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;

  try {
    const { searchParams } = request.nextUrl;
    const statut = searchParams.get("statut");
    const q = searchParams.get("q")?.trim();
    const periode = searchParams.get("periode"); // "aujourdhui", "semaine", "mois"
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (statut && statut !== "tous") {
      where.statut = statut as StatutCommande;
    }

    if (q) {
      where.OR = [
        { numero: { contains: q, mode: "insensitive" } },
        { client_nom: { contains: q, mode: "insensitive" } },
        { client_tel: { contains: q, mode: "insensitive" } },
        { client: { nom: { contains: q, mode: "insensitive" } } },
        { lignes: { some: { designation: { contains: q, mode: "insensitive" } } } },
        { lignes: { some: { numero_serie: { contains: q, mode: "insensitive" } } } },
      ];
    }

    if (periode) {
      const maintenant = new Date();
      if (periode === "aujourdhui") {
        const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), 0, 0, 0);
        where.date_commande = { gte: debut };
      } else if (periode === "semaine") {
        const debut = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.date_commande = { gte: debut };
      } else if (periode === "mois") {
        const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1, 0, 0, 0);
        where.date_commande = { gte: debut };
      }
    }

    const [total, commandes] = await Promise.all([
      prisma.commande.count({ where }),
      prisma.commande.findMany({
        where,
        orderBy: { date_commande: "desc" },
        skip,
        take: limit,
        include: {
          client: true,
          vendeur: { select: { id: true, username: true, role: true } },
          lignes: true,
        },
      }),
    ]);

    return NextResponse.json({
      commandes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (e: any) {
    console.error("GET /api/commandes:", e);
    return erreur(500, e.message || "Erreur lors du chargement des commandes.");
  }
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const body = await request.json();
    const {
      client_id,
      client_nom,
      client_tel,
      client_adresse,
      statut = "payee",
      type_paiement = "especes",
      lignes = [],
      remise_globale = 0,
      garantie_mois = 6,
      notes,
    } = body;

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return erreur(400, "Le panier ne contient aucun article.");
    }

    // Calculs financiers
    let totalHT = 0;
    const lignesTraitees = lignes.map((l: any) => {
      const pu = Number(l.prix_unitaire) || 0;
      const qte = Math.max(1, Number(l.quantite) || 1);
      const remiseLigne = Number(l.remise_ligne) || 0;
      const totalLigne = Math.max(0, pu * qte - remiseLigne);
      totalHT += totalLigne;

      return {
        produit_id: l.produit_id ? Number(l.produit_id) : null,
        modele_id: l.modele_id ? Number(l.modele_id) : null,
        code_interne: l.code_interne || "P-0000",
        designation: l.designation || "Article",
        numero_serie: l.numero_serie || null,
        categorie: l.categorie || null,
        quantite: qte,
        prix_unitaire: pu,
        remise_ligne: remiseLigne,
        total_ligne: totalLigne,
      };
    });

    const totalFinalTTC = Math.max(0, totalHT - Number(remise_globale || 0));

    // Calcul de la date de fin de garantie
    const garantieFin = new Date();
    garantieFin.setMonth(garantieFin.getMonth() + Number(garantie_mois || 6));

    // Transaction atomique
    const commandeCreee = await prisma.$transaction(async (tx) => {
      // 1. Génération du numéro séquentiel CMD-YYYY-XXXX
      const anneeCourante = new Date().getFullYear();
      const prefixe = `CMD-${anneeCourante}-`;
      
      const derniereCmd = await tx.commande.findFirst({
        where: { numero: { startsWith: prefixe } },
        orderBy: { id: "desc" },
        select: { numero: true },
      });

      let compteur = 1;
      if (derniereCmd) {
        const numPart = Number(derniereCmd.numero.split("-")[2]);
        if (!isNaN(numPart)) compteur = numPart + 1;
      }

      const numeroCommande = `${prefixe}${String(compteur).padStart(4, "0")}`;

      // 2. Création de la commande
      const cmd = await tx.commande.create({
        data: {
          numero: numeroCommande,
          statut: statut as StatutCommande,
          type_paiement: type_paiement as TypePaiement,
          client_id: client_id ? Number(client_id) : null,
          client_nom: client_nom || (client_id ? null : "Client Particulier"),
          client_tel: client_tel || null,
          client_adresse: client_adresse || null,
          total_ht: totalHT,
          total_tva: 0,
          total_ttc: totalFinalTTC,
          remise_globale: Number(remise_globale || 0),
          garantie_mois: Number(garantie_mois || 6),
          garantie_fin: garantieFin,
          notes: notes || null,
          cree_par: user.id,
          lignes: {
            create: lignesTraitees,
          },
        },
        include: {
          client: true,
          lignes: true,
          vendeur: { select: { id: true, username: true } },
        },
      });

      // 3. Déstockage des exemplaires physiques si statut payee ou en_attente
      if (statut === "payee" || statut === "en_attente") {
        for (const l of lignesTraitees) {
          if (l.produit_id) {
            await tx.produit.update({
              where: { id: l.produit_id },
              data: {
                statut: "vendu",
                date_vente: new Date(),
                prix_vente_reel: l.prix_unitaire,
              },
            });

            await tx.historiqueStatut.create({
              data: {
                produit_id: l.produit_id,
                user_id: user.id,
                statut_avant: "en_vente",
                statut_apres: "vendu",
                note: `Vente effectuée sur la commande ${numeroCommande}`,
              },
            });
          }
        }
      }

      return cmd;
    });

    // Journal d'audit
    await enregistrerActivite(
      prisma,
      user.id,
      ACTIONS_JOURNAL.VENTE_ENREGISTRER,
      "commande",
      commandeCreee.id,
      {
        numero: commandeCreee.numero,
        total_ttc: commandeCreee.total_ttc,
        nb_lignes: lignesTraitees.length,
      }
    );

    return NextResponse.json(commandeCreee, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/commandes:", e);
    return erreur(500, e.message || "Erreur lors de la création de la commande.");
  }
}
