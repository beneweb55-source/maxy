# RAPPORT D'AUDIT — SOLMAXY/maxy
**Date :** 2026-09-17
**Auditeur :** Claude (hawiyat-composer v2.0)
**Portee :** Audit complet + corrections + nouvelles fonctionnalites

---

## 1. BUGS CORRIGES

### 1.1 BUG CRITIQUE : categories_id non transmis lors de la creation de produits
- **Racine :** `lib/validation.ts` — la fonction `validerLignesProduits` extrayait `reference`, `categorie`, `prix_achat` etc. mais **ignorait completement `categorie_id` et `modele_id`** du corps de la requete.
- **Impact :** TOUS les produits crees via `POST /api/produits` avaient `categorie_id = null`. Ils n'apparaissaient jamais quand on filtrait par sous-categorie.
- **Correction :** Extraction de `categorie_id` et `modele_id` dans le schema d'entree + ajout au type `LigneProduitEntree` + transmission dans la sortie validee.
- **Fichiers modifies :**
  - `lib/validation.ts` (lignes 9-13, 62-73, 94-106)
  - `app/api/produits/route.ts` (lignes 224-240)

### 1.2 Migration destructive supprimee
- **Racine :** La migration `20260917070744_credits_charges` contenait `DROP TABLE "bom_entries"` — operation destructive interdite par les regles.
- **Correction :** Suppression du `DROP TABLE` et des `DROP CONSTRAINT` associes. La table `bom_entries` est conservee pour preserver les donnees.
- **Fichier :** `prisma/migrations/20260917070744_credits_charges/migration.sql`

### 1.3 Compteurs de categories incoherents
- **Racine :** Les `_count.produits` dans les APIs categories comptaient TOUS les produits (y compris vendus, HS, assembles), mais l'inventaire filtre par defaut ceux-la. Resultat : les cartes de categories affichaient "5 produits" alors que la table en montrait 0.
- **Correction :** Ajout d'un filtre `where: { statut: { notIn: ["vendu", "hs", "assemble"] } }` dans les `_count` des deux APIs categories.
- **Fichiers modifies :**
  - `app/api/categories/route.ts`
  - `app/api/categories/[id]/route.ts`

### 1.4 Cachets/stamps retires de TOUS les documents
- **Racine :** Les cachets (`/brand/cachet.png`) etaient rendus sur 4 templates differents.
- **Fichiers modifies :**
  - `components/factures/TemplateFactureA4.tsx` — zone cachet remplacee par "Emis par : [vendeur]"
  - `components/factures/GarantieCertificat.tsx` — image cachet supprimee
  - `components/commandes/FicheCommande.tsx` — image cachet supprimee
  - `components/commandes/ImpressionMasseCommandes.tsx` — image cachet supprimee

---

## 2. NOUVELLES FONCTIONNALITES

### 2.1 Systeme de Credits Clients
- **API :** 3 routes creees
  - `GET/POST /api/credits` — liste avec filtres + creation depuis une vente
  - `GET/PATCH /api/credits/[id]` — detail + mise a jour
  - `GET/POST /api/credits/[id]/paiements` — historique + enregistrement paiement
- **UI :** 4 composants
  - `components/credits/DashboardCredits.tsx` — 4 KPIs (total, paye, restant, impaye)
  - `components/credits/ListeCredits.tsx` — liste filrable avec badges statut + barres progression
  - `components/credits/DetailCredit.tsx` — detail complet + modale paiement
  - `app/(app)/credits/page.tsx` — page avec navigation dashboard → liste → detail
- **Permissions :** gerant/dev/social_media (creation + paiements), tous (lecture)

### 2.2 Systeme de Charges/Depenses
- **API :** 2 routes
  - `GET/POST /api/charges` — liste avec stats + creation avec enregistrement caisse
  - `GET/PATCH/DELETE /api/charges/[id]` — detail + modif + suppression
- **UI :** 1 page complete
  - `app/(app)/charges/page.tsx` — 5 KPIs, repartition par categorie, filtres, CRUD
- **Integration caisse :** Les charges creent automatiquement un mouvement `frais` dans la caisse
- **Permissions :** gerant/dev (creation/modification), gerant seul (suppression)

### 2.3 Page Resume Financier Client
- **UI :** `app/(app)/clients/[id]/page.tsx` — resume 4 KPIs, onglets credits/ventes/paiements
- **API :** Reutilise `GET /api/credits?client_id=X`

### 2.4 Types de Documents : Bon de Livraison + Bon d'Achat
- **Enum TypeDocument :** Ajout `BON_LIVRAISON` et `BON_ACHAT`
- **Prefixes numerotation :** `BL-AAAA-NNNN` et `BA-AAAA-NNNN`
- **Fichiers modifies :**
  - `prisma/schema.prisma` — enum etendue
  - `lib/factures.ts` — TypeDocumentLegal etendu + prefixes ajoutes + validation etendue
  - `components/factures/TemplateFactureA4.tsx` — titres pour BL et BA
  - `components/factures/ListeFactures.tsx` — filtres et badges pour BL et BA
  - `app/api/factures/route.ts` — filtre type etendu
  - `app/api/factures/[id]/route.ts` — validation type etendue
  - `app/api/ventes/route.ts` — creation facture avec type etendu

### 2.5 Navigation mise a jour
- **Fichier :** `components/AppShell.tsx`
- **Ajouts :** Entrees "Credits" et "Charges" dans la sidebar
- **Icons :** `IconeCredit` et `IconeDepense` ajoutes dans `components/icons.tsx`
- **i18n :** Cles `nav.credits` et `nav.charges` ajoutees dans `lib/i18n/fr.ts` et `lib/i18n/en.ts`

---

## 3. BASE DE DONNEES

### 3.1 Nouvelles tables (migration 20260917070744)
- `vente_credits` — credits clients (vente_id unique, client_id, montants, statut, echeance)
- `paiement_credits` — paiements sur credits (montant, mode, reference, user_id)
- `charges` — charges/depenses (categorie, libelle, montant, mode_paiement, user_id)

### 3.2 Nouvelles enums
- `StatutCredit` : paye, partiellement_paye, impaye, en_retard
- `ModePaiement` : especes, virement, carte, cheque, autre
- `CategorieCharge` : loyer, electricite, internet, telephone, salaires, transport, carburant, fournitures, maintenance, marketing, logiciels, taxes, bancaires, autre
- `TypeDocument` : + BON_LIVRAISON, BON_ACHAT

### 3.3 Regles de securite
- Aucune suppression destructive (bom_entries conservee)
- Aucune reinitialisation de taxonomy
- Aucun produit supprime
- Migration safe pour production

---

## 4. COHERENCE FINANCIERE

### 4.1 Flux Vente → Caisse
- Vente cree un mouvement `vente` dans la caisse ✓
- Credit paiement: la vente originale a deja enregistre le montant total ✓
- Charge cree un mouvement `frais` dans la caisse ✓

### 4.2 Formule Ventes - COGS - Charges = Resultat
- **Ventes :** Chiffre d'affaires via `GET /api/ventes` (totaux.chiffre_affaires)
- **COGS :** Cout d'achat via `prix_achat` sur chaque produit vendu
- **Charges :** Nouveau systeme avec table `charges` + integration caisse
- **Resultat :** `beneficeDuMois()` dans `lib/caisse-db.ts` — calcule `total_ventes - total_achats`

---

## 5. PERMISSIONS VERIFIEES

| Route | GET | POST | PATCH | DELETE |
|-------|-----|------|-------|--------|
| /api/credits | tous | gerant/dev/social | — | — |
| /api/credits/[id] | tous | — | gerant/dev | — |
| /api/credits/[id]/paiements | tous | gerant/dev/social | — | — |
| /api/charges | tous | gerant/dev | — | — |
| /api/charges/[id] | tous | — | gerant/dev | gerant seul |

---

## 6. TESTS RECOMMANDES

1. **Creation produit avec categorie_id** : Verifier que `categorie_id` est bien sauvegarde en base
2. **Filtrage sous-categorie** : Creer un produit dans une sous-categorie, verifier qu'il apparait dans le filtre
3. **Credit depuis vente** : Creer une vente → creer un credit → ajouter un paiement → verifier le statut
4. **Charge + caisse** : Creer une charge → verifier que le mouvement `frais` apparait dans la caisse
5. **Document BON_LIVRAISON** : Creer une facture type BL → verifier le titre et la numerotation
6. **Cascade BOM** : Vendre un produit compose → verifier que les composants passent en "vendu"
7. **Suppression charge** : Tenter de supprimer une charge en tant que technicien → doit etre refuse
8. **Page client** : Naviguer vers /clients/[id] → verifier les 3 onglets

---

## 7. RISQUES RESTANTS

1. **Produits existants sans categorie_id** : Les produits crees avant la correction n'ont pas de `categorie_id`. L'utilisateur doit les reclasser manuellement ( conformement a la regle "Ne reinitialise pas la taxonomy").
2. **Profondeur d'arborescence** : Le filtre categorie gere 3 niveaux max (famille → catégorie → sous-catégorie). Si l'arborescence est plus profonde, les produits des niveaux inferieurs n'apparaitront pas au niveau racine.
3. **Credit sans integration vente** : Le flux de vente (commandes) ne propose pas nativement l'option "vente a credit". Les credits doivent etre crees manuellement via l'API ou la page credits.
4. **bom_entries orpheline** : La table `bom_entries` existe toujours en base mais n'est plus referencee par le schema Prisma. A nettoyer ultérieurement si nécessaire.

---

## 8. FICHIERS MODIFIES (recapitulatif)

| Fichier | Action |
|---------|--------|
| `lib/validation.ts` | Correction categorie_id + modele_id |
| `lib/factures.ts` | TypeDocumentLegal etendu + prefixes BL/BA |
| `lib/i18n/fr.ts` | Cles nav.credits, nav.charges |
| `lib/i18n/en.ts` | Cles nav.credits, nav.charges |
| `components/icons.tsx` | IconeCredit + IconeDepense |
| `components/AppShell.tsx` | Navigation credits + charges |
| `components/factures/TemplateFactureA4.tsx` | Titres BL/BA + cachet retire |
| `components/factures/GarantieCertificat.tsx` | Cachet retire |
| `components/factures/ListeFactures.tsx` | Filtres BL/BA |
| `components/commandes/FicheCommande.tsx` | Cachet retire |
| `components/commandes/ImpressionMasseCommandes.tsx` | Cachet retire |
| `app/api/produits/route.ts` | categorie_id + modele_id dans POST |
| `app/api/categories/route.ts` | Compteurs filtres par statut |
| `app/api/categories/[id]/route.ts` | Compteurs filtres par statut |
| `app/api/factures/route.ts` | Filtre type etendu |
| `app/api/factures/[id]/route.ts` | Validation type etendue |
| `app/api/ventes/route.ts` | Type document etendu |
| `prisma/schema.prisma` | Enums + modeles credits/charges |
| `prisma/migrations/.../migration.sql` | DROP TABLE supprime |

## 9. FICHIERS CREES (recapitulatif)

| Fichier | Description |
|---------|-------------|
| `app/api/credits/route.ts` | API credits (GET + POST) |
| `app/api/credits/[id]/route.ts` | API detail credit |
| `app/api/credits/[id]/paiements/route.ts` | API paiements credit |
| `app/api/charges/route.ts` | API charges (GET + POST) |
| `app/api/charges/[id]/route.ts` | API detail/modif/suppression charge |
| `app/(app)/credits/page.tsx` | Page credits |
| `app/(app)/charges/page.tsx` | Page charges |
| `app/(app)/clients/[id]/page.tsx` | Page resume client |
| `components/credits/DashboardCredits.tsx` | Dashboard credits |
| `components/credits/ListeCredits.tsx` | Liste credits |
| `components/credits/DetailCredit.tsx` | Detail credit + paiement |
