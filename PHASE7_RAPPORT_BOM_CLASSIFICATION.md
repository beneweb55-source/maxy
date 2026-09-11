# Phase 7 — Rapport Audit : BOM & Classification Automatique

**Date :** 11 septembre 2026
**Commit :** 3309f6e
**Statut :** Code complet — Migration DB en attente d'exécution sur Vercel

---

## Résumé Exécutif

Phase 7 a traité trois systèmes interconnectés :

1. **Classification Produits** — Renforcement des règles auto-classification avec scoring numérique et protection faux-positifs
2. **Auto-Classification Import** — Ajout du `scoreNumerique` (0-100), détection des produits finis composites
3. **BOM (Produits Composés)** — Refonte complète de l'architecture : nouvelle table `bom_entries` avec contrôle quantité

---

## 1. Système BOM — Refonte Architecture

### Problème Racine Identifié

L'ancien système utilisait `parent_id` sur la table `produits` pour modéliser les composants d'un produit composé. **Ce modèle était structurellement défaillant** :

- Pas de champ `quantite` — impossible d'exprimer "2 barrettes de RAM" sans créer 2 lignes physiques dupliquées
- Le composant était un `Produit` physique avec `parent_id` — aucun join table
- Impossible de modifier la quantité sans détacher/rattacher
- Pas de track record propre des opérations BOM

### Solution : Table `bom_entries`

```sql
CREATE TABLE "bom_entries" (
    id                    SERIAL PRIMARY KEY,
    produit_parent_id     INTEGER NOT NULL REFERENCES produits(id),
    produit_composant_id  INTEGER NOT NULL REFERENCES produits(id),
    quantite              INTEGER NOT NULL DEFAULT 1,
    created_at            TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP(3),
    UNIQUE(produit_parent_id, produit_composant_id)
);
```

### Fichiers Modifiés

| Fichier | Changement |
|---------|-----------|
| `prisma/schema.prisma` | Ajout modèle `BomEntry` + relations |
| `prisma/migrations/20260911_bom_entries/` | Migration standard + idempotente |
| `app/api/produits/[id]/composants/route.ts` | **Réécriture complète** — GET/POST/PATCH/DELETE sur BomEntry |
| `app/api/produits/[id]/route.ts` | `nb_composants` compté depuis BomEntry |
| `app/api/produits/composants/disponibles/route.ts` | Exclusion des produits dans BomEntry |
| `components/inventaire/FormulaireAjoutUnifie.tsx` | Soumission BOM simplifiée (1 appel/component avec quantite) |
| `components/inventaire/PanneauComposants.tsx` | Affichage quantité + contrôles [-] N [+] |

### Nouvelles Fonctionnalités BOM

- **Quantité par composant** : contrôle [-] N [+] directement dans l'interface
- **Déduplication** : ajouter un composant déjà sélectionné incrémente la quantité au lieu de créer un doublon
- **Coût total** : calcul multiplié par la quantité (`prix_achat * quantite`)
- **PATCH séparé** : modification de quantité sans tout recréer
- **Exclusion intelligente** : les composants déjà attachés n'apparaissent plus dans la recherche

### API Endpoints

| Méthode | Endpoint | Action |
|---------|----------|--------|
| GET | `/api/produits/[id]/composants` | Liste composants + quantités + stats + historique |
| POST | `/api/produits/[id]/composants` | Attache un composant (upsert BomEntry avec quantite) |
| PATCH | `/api/produits/[id]/composants` | Modifie la quantité d'un composant |
| DELETE | `/api/produits/[id]/composants` | Détache un composant (remise en stock) |

### Sécurité

- **Vérification BOM role** : un produit marqué `finished` ne peut PAS être utilisé comme composant
- **Statut vérifié** : les produits `vendu` ou `hs` sont rejetés
- **Auto-référence interdite** : un produit ne peut pas être son propre composant
- **Historique** : toutes les opérations sont tracées dans `composition_historique`

---

## 2. Auto-Classification — Scoring Numérique

### Problème Racine

L'ancien système ne donnait que des labels textuels ("haut"/"moyen"/"faible") — pas de mesure quantitative de la confiance.

### Solution : `scoreNumerique` (0-100)

| Règle | Score | Justification |
|-------|-------|---------------|
| Produit vide/non classifié | 0 | Aucune donnée |
| Pas de classification | 15 | Rien ne correspond |
| Heuristique fallback | 65 | Corresponance partielle |
| Xeon (produit fini) | 60 | Risque de faux positif |
| Xeon (normal) | 95 | Pattern très spécifique |
| Moniteurs | 85 | Pattern modéré |
| Réseau | 85 | Pattern modéré |
| GPU | 90 | Pattern fort |
| Imprimantes | 90 | Pattern fort |
| Consommables | 90 | Pattern fort |
| POS | 88 | Pattern modéré |
| SSD/HDD | 91 | Pattern fort |
| RAM | 93 | Pattern très spécifique |
| Serveurs | 94 | Pattern très spécifique |
| Desktops | 91 | Pattern fort |
| Laptops | 93 | Pattern très spécifique |
| Chargeurs | 92 | Pattern très spécifique |
| Override utilisateur | 100 | Validation humaine |

### Protection Faux-Positifs

**Problème identifié** : Le nom "Acer Aspire 8GB RAM 512GB SSD" pouvait déclencher les règles RAM/SSD AVANT la règle Laptop.

**Solution** : Regex `estProduitFini` détecte les patterns de produits finis (laptops, desktops, serveurs) et bloque les règles de composants :

```typescript
const estProduitFini = /\b(laptop|notebook|pc portable|desktop|all.in.one|serveur|server|workstation|imprimante.*complet)\b/i.test(tekst);
```

Les règles RAM et SSD/HDD incluent désormais la garde `!estProduitFini`.

---

## 3. Interface Utilisateur

### AssistantImportation

- Affichage du score numérique avec code couleur :
  - Vert : score ≥ 80 (fiable)
  - Ambre : score 50-79 (à vérifier)
  - Rouge : score < 50 (manuel requis)
- Stats : compteur `fiables` / `aVerifier` / `manuel`
- Override utilisateur → scoreNumerique = 100

### PanneauComposants

- Affichage "N type(s) · M pièce(s)" au lieu de "N pièce(s)"
- Contrôles [-] N [+] par composant
- Coût total multiplié par quantité
- Affichage du prix unitaire entre parenthèses quand quantité > 1

### FormulaireAjoutUnifie

- Déduplication automatique (ajout = incrémente quantité)
- Quantité minimale = 1
- Soumission simplifiée : 1 appel API par composant au lieu de N

---

## 4. Migration DB — En Attente

Le fichier `prisma/migrations/20260911_bom_entries/idempotent.sql` doit être exécuté sur la base Vercel/Neon.

**Commande à exécuter dans le SQL Editor Vercel :**
```sql
-- Contenu du fichier idempotent.sql
-- Voir : prisma/migrations/20260911_bom_entries/idempotent.sql
```

**⚠️ IMPORTANT** : La migration est idempotente — sûre à exécuter plusieurs fois.

---

## 5. Ce Qui Reste

| Tâche | Priorité | Statut |
|-------|----------|--------|
| Exécuter `idempotent.sql` sur Vercel DB | CRITIQUE | En attente |
| Tester workflow BOM complet (créer → composants → quantité → sauvegarder → réouvrir → modifier) | HAUTE | En attente migration |
| Tester auto-classification avec vrais produits (CPU, RAM, SSD, GPU, serveurs, laptops) | MOYENNE | En attente déploiement |
| Rapport final Phase 7 (résultats tests) | MOYENNE | En attente |
| Exécuter `reclassify-xeons.sql` sur Vercel DB (Phase 5) | HAUTE | En attente |
| Exécuter `idempotent.sql` backup système | MOYENNE | En attente |

---

## 6. Règles Absolues Respectées

- **AUCUN produit supprimé** — aucun DELETE sur la table produits
- **Taxonomie non réinitialisée** — audit d'abord, validation ensuite
- **Pas de prisma db push** — migration SQL créée manuellement
- **Pas d'opérations destructrices** — pas de DROP TABLE, TRUNCATE, ou migrate reset
- **Pas d'emoji dans les formulaires**
- **Design pour techniciens** — pas de template SaaS générique

---

## 7. Résumé des Changements

```
10 fichiers modifiés/créés
488 insertions, 249 suppressions
1 nouvelle table (bom_entries)
4 nouveaux endpoints API
0 produit supprimé
```
