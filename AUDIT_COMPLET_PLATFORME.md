# 🔍 AUDIT COMPLET — Solution Maxi Platform

**Date :** 2026-09-18 | **Portée :** 72K lignes, 110 APIs, 94 composants, 34 pages, 34 modèles DB

---

## 📊 STATISTIQUES GLOBALES

| Catégorie | 🔴 CRITIQUE | 🟠 HAUT | 🟡 MOYEN | 🟢 BAS | Total |
|-----------|------------|---------|----------|--------|-------|
| **Backend / API / DB** | 6 | 10 | 13 | 10 | **39** |
| **Classification Produits** | 4 | 0 | 8 | 5 | **17** |
| **Frontend / Design** | 6 | 0 | 15 | 0 | **21** |
| **i18n / Navigation** | 2 | 0 | 7 | 4 | **13** |
| **TOTAL** | **18** | **10** | **43** | **19** | **90** |

---

## 🔴 PHASE 1 — CORRECTIONS CRITIQUES (Bloquantes)

### 1.1 Sécurité — Accès non authentifié

| ID | Problème | Fichier | Fix |
|----|----------|---------|-----|
| SEC-01 | `/commandes/impression-masse` — Aucun check auth | `app/(app)/commandes/impression-masse/page.tsx` | Ajouter middleware ou `exigerUtilisateur()` |
| SEC-02 | `/factures/impression-masse` — Aucun check auth | `app/(app)/factures/impression-masse/page.tsx` | Idem |
| SEC-03 | `/imprimer-etiquettes` — Aucun check auth | `app/(app)/imprimer-etiquettes/page.tsx` | Idem |
| SEC-04 | `GET /api/admin/migration/analyser` — Pas d'auth | `app/api/admin/migration/analyser/route.ts:88` | Ajouter `exigerUtilisateur(["gerant", "dev"])` |

### 1.2 Sécurité — Rôle `social_media` avec trop de droits

| ID | Problème | Fichier | Fix |
|----|----------|---------|-----|
| SEC-05 | Peut modifier/supprimer des commandes | `app/api/commandes/[id]/route.ts:49,103` | Restreindre DELETE à `["gerant", "dev"]` |
| SEC-06 | Peut forcer le statut produit via scan override | `app/api/scan/override/route.ts:11` | Retirer `"social_media"` des rôles autorisés |
| SEC-07 | Peut créer des crédits et enregistrer des paiements | `app/api/credits/route.ts:119`, `paiements/route.ts:48` | Restreindre à `["gerant", "dev"]` |
| SEC-08 | Peut modifier les factures (type_vente, client) | `app/api/factures/[id]/route.ts:139` | Restreindre changement type_vente à `["gerant", "dev"]` |

### 1.3 Classification Produits — Problème central

| ID | Problème | Impact | Fix |
|----|----------|--------|-----|
| CLS-01 | **Double stockage `categorie` (String) + `categorie_id` (FK)** — 5 chemins d'écriture différents mettent à jour le champ texte avec des valeurs différentes | Données incohérentes, filtres cassés | Créer un middleware Prisma ou trigger qui synchronise toujours le texte depuis `categorie_rel.nom` |
| CLS-02 | **3 moteurs de classification incohérents** — `test_full_classification.ts`, `autoClassifyImport.ts`, `moteur.ts` utilisent des noms de familles/catégories différents | Doublons dans l'arbre DB | Unifier sur la taxonomie canonique de `taxonomie-canonical.ts` |
| CLS-03 | **`apply_classification.ts` crée 1 modèle par produit** au lieu de regroupement par référence | Explosion de modèles inutiles | Grouper par `reference` avant création |
| CLS-04 | **Xeon catégorisé "MÉMOIRE" (import) vs "COMPOSANTS" (migration)** | Incohérence inter-moteurs | Harmoniser les arbres de décision |

### 1.4 Intégrité Financière

| ID | Problème | Fichier | Fix |
|----|----------|---------|-----|
| FIN-01 | **Race condition dans `ajouterMouvement`** — solde calculé depuis lecture non verrouillée | `lib/caisse-db.ts:17-31` | `SELECT ... FOR UPDATE` ou stocker le solde dans Parametres avec `Serializable` isolation |
| FIN-02 | **Annulation vente Yalidine reverse dans la mauvaise caisse** | `app/api/ventes/[id]/annulation/route.ts:72-79` | Aussi vérifier `Vente.type_vente` quand pas de facture |
| FIN-03 | **Changement type_vente facture ne crée pas d'ajustement caisse** | `app/api/factures/[id]/route.ts:228-282` | Créer mouvement annulation + nouveau mouvement |
| FIN-04 | **Suppression masse commandes ne reverse pas la caisse** | `app/api/commandes/masse/suppression/route.ts` | Ajouter reversement MouvementCaisse |

### 1.5 i18n — Labels FR échangés

| ID | Problème | Fichier | Fix |
|----|----------|---------|-----|
| I18-01 | `tableur.reference` affiche "Catégorie" et `tableur.categorie` affiche "Famille/Référence" — **inversés** | `lib/i18n/fr.ts:182-183` | Corriger les valeurs |
| I18-02 | `inventaire.colReference` et `inventaire.colCategorie` — **inversés** | `lib/i18n/fr.ts:404-405` | Corriger les valeurs |

### 1.6 Intégrité Données

| ID | Problème | Fichier | Fix |
|----|----------|---------|-----|
| DATA-01 | **Suppression lot ne nettoie pas `factureLigne` ni `ligneCommande`** | `app/api/lots/[id]/route.ts:208-238` | Ajouter cleanup avant deletion |
| DATA-02 | **Prix bulk force `statut: "en_vente"` sur TOUS les produits** y compris ceux pas prêts | `app/api/produits/masse/prix/route.ts:58` | Ne transitionner que les produits en statut `"ok"` |
| DATA-03 | **PATCH charges ne valide pas l'enum `categorie`** | `app/api/charges/[id]/route.ts:60` | Ajouter validation comme le POST |
| DATA-04 | **Recherche utilise texte non normalisé** | `app/api/recherche/route.ts:28-106` | Utiliser `terme` (normalisé) au lieu de `q` |

---

## 🟠 PHASE 2 — PROBLÈMES HAUTES PRIORITÉS

### 2.1 Performance

| ID | Problème | Fichier | Fix |
|----|----------|---------|-----|
| PERF-01 | **Caisse charge TOUS les mouvements en mémoire** pour graphiques | `app/api/caisse/route.ts:29-32` | SQL `GROUP BY` date-bucketed |
| PERF-02 | **Credits GET double requête** — charge tout 2x pour totaux | `app/api/credits/route.ts:95-109` | Utiliser `prisma.venteCredit.aggregate()` |
| PERF-03 | **Import 5000 lignes dans une seule transaction** | `app/api/produits/import/route.ts:139` | Batch inserts groupés de 100-500 |
| PERF-04 | **Lots GET charge tous les produits de tous les lots** | `app/api/lots/route.ts:13-15` | Utiliser `_count` et `_sum` aggregations |
| PERF-05 | **Vitrine charge TOUS les produits non vendus** | `app/api/vitrine/route.ts:50-66` | Utiliser `groupBy` aggregation |

### 2.2 Frontend — Refactoring critique

| ID | Problème | Fichier | Fix |
|----|----------|---------|-----|
| FE-01 | **`Inventaire.tsx` = 2000+ lignes** — composant monolithique | `components/inventaire/Inventaire.tsx` | Décomposer en sous-composants |
| FE-02 | **`credits/page.tsx` utilise `any[]` + `window.confirm()`** au lieu de `ConfirmerAction` | `app/(app)/credits/page.tsx` | Typer les données + utiliser `useConfirmation()` |
| FE-03 | **`administration/migration/page.tsx`** utilise couleurs Tailwind raw au lieu des brand tokens | `app/(app)/administration/migration/page.tsx` | Remplacer par `brand-*` tokens |
| FE-04 | **Auth redirect vers `/` au lieu de `/connexion`** dans carnets et journal | `app/(app)/carnet/[id]/page.tsx`, `administration/journal/page.tsx` | Corriger la redirection |
| FE-05 | **`IndicateurConnexion` utilise `brand-red` non défini** — devrait être `danger` | `components/IndicateurConnexion.tsx` | Remplacer par `danger` |

### 2.3 Modules sans i18n

| ID | Module | Fichier | Fix |
|----|--------|---------|-----|
| I18-03 | **Crédits** — 0 clé i18n, tout en dur | `components/credits/*.tsx` | Créer namespace `credits.*` |
| I18-04 | **Charges** — 30+ chaînes en dur | `app/(app)/charges/page.tsx` | Créer namespace `charges.*` |
| I18-05 | **Clients** — tout en dur | `app/(app)/clients/[id]/page.tsx` | Créer namespace `clients.*` |
| I18-06 | **9× `window.confirm()`** en français | Multiples fichiers | Remplacer par `useConfirmation()` |

---

## 🟡 PHASE 3 — AMÉLIORATIONS MOYENNES

### 3.1 Schéma DB

| ID | Problème | Fix |
|----|----------|-----|
| DB-01 | `Charge.statut` est String au lieu d'enum | Créer `enum StatutCharge` |
| DB-02 | `Facture.mode_paiement` est String au lieu d'enum `TypePaiement` | Aligner sur l'enum |
| DB-03 | `Notification.groupe` est String libre | Créer `enum GroupeNotification` |
| DB-04 | `CompositionHistorique.action` est String libre | Créer `enum ActionComposition` |
| DB-05 | Pas d'unicité `@@unique([nom, categorie_id])` sur Modele | Ajouter contrainte |
| DB-06 | Manque `@@index` sur `Charge.user_id` | Ajouter index |
| DB-07 | `Parametres` singleton脆弱 — si ligne supprimée = crash silencieux | Seed script de garantie |

### 3.2 Design / UI

| ID | Problème | Fix |
|----|----------|-----|
| UI-01 | Toast `"info"` et `"avertissement"` visuellement identiques (orange) | Différencier : bleu pour info, ambre pour avertissement |
| UI-02 | Toast pas d'animation d'entrée/sortie | Ajouter CSS transition |
| UI-03 | Toast pas de bouton fermer | Ajouter bouton × |
| UI-04 | `Skeleton.tsx` utilise `grid-cols-${nombre}` — pas JIT-friendly | Utiliser lookup map |
| UI-05 | Icônes mélangées lucide-react vs custom icons dans FicheProduit, DashboardCommandes, ModaleVente | Unifier sur le système custom |
| UI-06 | Dark mode gradient visible sur fond sombre | `globals.css:118-120` — ajuster pour dark mode |
| UI-07 | `imprimer-etiquettes` sans dark mode | Ajouter variantes dark |
| UI-08 | `pushManager.tsx` toutes les chaînes en dur FR | Internationaliser |

### 3.3 Classification — Améliorations

| ID | Problème | Fix |
|----|----------|-----|
| CLS-05 | `Modele.attributs` non validé par `Categorie.attributs_schema` | Appliquer validation à la création |
| CLS-06 | Limite `take: 100` sur `/api/modeles` non documentée | Augmenter ou paginer |
| CLS-07 | PUT modèle synchronise `categorie` texte sur tous les exemplaires | Effet de bord inattendu — documenter ou restreindre |
| CLS-08 | Import ne pré-remplit pas les attributs du modèle | Utiliser `autoClassifyProduct()` pour specs |
| CLS-09 | 18 scripts de migration/debug dispersés | Consolider en un seul paramétrable |

### 3.4 Sécurité mineure

| ID | Problème | Fix |
|----|----------|-----|
| SEC-09 | Login sans rate limiting IP (only account lockout) | Ajouter middleware 10 req/min/IP |
| SEC-10 | Messages d'erreur exposent détails internes (`e?.message`) | Log serveur, message générique client |
| SEC-11 | Backup endpoints utilisent pattern auth manuel au lieu de `exigerUtilisateur()` | Refactoriser |

---

## 🟢 PHASE 4 — BONNES PRATIQUES

| ID | Problème | Fix |
|----|----------|-----|
| BP-01 | `Parametres` singleton fragile | Seed script garanti |
| BP-02 | `Vente.produit` sans `onDelete` explicite | Ajouter `onDelete: Restrict` explicite |
| BP-03 | `lib/statuts.ts` — champ `libelle` en dur FR (unused) | Supprimer ou internationaliser |
| BP-04 | `lib/constantes.ts` — `LABELS_STATUT_COMMANDE` non i18n | Ajouter clés i18n |
| BP-05 | `Facture.updated_at` a `@default(now())` redondant avec `@updatedAt` | Supprimer `@default` |
| BP-06 | Pas de profil specs pour onduleurs/câbles/adaptateurs | Ajouter profils dans matrice-specifications |
| BP-07 | `CategorieInfo`/`FamilleInfo` potentiellement inutilisées | Vérifier usage, supprimer si mort |

---

## 🏗️ ARCHITECTURE RECOMMANDÉE

### Fichiers à modifier (par priorité)

**Priorité 1 — Sécurité (8 fichiers)**
```
middleware.ts                           → Ajouter routes impression-masse, etiquettes
app/api/commandes/[id]/route.ts         → Restreindre social_media
app/api/scan/override/route.ts          → Retirer social_media
app/api/credits/route.ts               → Restreindre social_media
app/api/credits/[id]/paiements/route.ts → Restreindre social_media
app/api/factures/[id]/route.ts          → Restreindre social_media
app/api/admin/migration/analyser/route.ts → Ajouter auth GET
app/api/auth/login/route.ts            → Rate limiting
```

**Priorité 2 — Classification (6 fichiers)**
```
lib/auto-classify-import.ts             → Unifier avec taxonomie-canonical.ts
lib/taxonomie-canonical.ts              → Source unique de vérité
lib/migration/moteur.ts                 → Aligner sur taxonomie canonique
app/api/admin/migration/classify/route.ts → Standardiser noms
scripts/apply_classification.ts         → Regrouper par référence
components/inventaire/ModalClassification.tsx → Forcer création au niveau feuille
```

**Priorité 3 — Intégrité financière (4 fichiers)**
```
lib/caisse-db.ts                        → Fix race condition solde
app/api/ventes/[id]/annulation/route.ts → Fix caisse Yalidine
app/api/factures/[id]/route.ts          → Fix migration type_vente
app/api/commandes/masse/suppression/route.ts → Reverse caisse
```

**Priorité 4 — i18n (5 fichiers)**
```
lib/i18n/fr.ts                          → Fix labels inversés + ajouter namespaces credits/charges/clients
lib/i18n/en.ts                          → Ajouter namespaces credits/charges/clients
components/credits/*.tsx (3 fichiers)   → Remplacer texte dur par t()
app/(app)/charges/page.tsx              → Remplacer texte dur par t()
app/(app)/clients/[id]/page.tsx         → Remplacer texte dur par t()
```

**Priorité 5 — Frontend/Design (8 fichiers)**
```
components/inventaire/Inventaire.tsx    → Refactoriser (2000+ lignes)
app/(app)/credits/page.tsx              → Typing + ConfirmerAction
app/(app)/administration/migration/page.tsx → Brand tokens
components/toast.tsx                    → Info/wavertissement distincts + animation + dismiss
components/IndicateurConnexion.tsx      → Fix brand-red → danger
components/Skeleton.tsx                 → Fix JIT grid-cols
components/AppShell.tsx                 → Internationaliser raccourcis
app/globals.css                         → Fix dark mode gradient
```

**Priorité 6 — Performance (5 fichiers)**
```
app/api/caisse/route.ts                 → SQL GROUP BY au lieu de chargement mémoire
app/api/credits/route.ts                → aggregate() au lieu de findMany ×2
app/api/produits/import/route.ts        → Batch inserts
app/api/lots/route.ts                   → _count/_sum aggregations
app/api/vitrine/route.ts                → groupBy aggregation
```

---

## 🧪 TESTS NÉCESSAIRES

### Tests critiques (bloquants)

| # | Test | Type | Couvre |
|---|------|------|--------|
| T01 | Auth — Pages impression-masse sans cookie → 307 redirect | E2E | SEC-01/02/03 |
| T02 | Role social_media — Tenter DELETE commande → 403 | API | SEC-05 |
| T03 | Role social_media — Tenter création crédit → 403 | API | SEC-07 |
| T04 | Race condition caisse — 10 ventes simultanées → solde cohérent | Load test | FIN-01 |
| T05 | Classification — Vérifier que tous les produits ont `categorie` = `categorie_rel.nom` | Script audit | CLS-01 |
| T06 | Annulation vente Yalidine — Vérifier reverse dans bonne caisse | API | FIN-02 |
| T07 | Labels FR — Vérifier `tableur.reference` = "Référence" | Unit test | I18-01 |

### Tests de régression

| # | Test | Type | Couvre |
|---|------|------|--------|
| T08 | Classification import — Grouper modèles par référence (pas 1 par produit) | E2E | CLS-03 |
| T09 | Prix bulk — Produit en statut `recu` pas forcé en `en_vente` | API | DATA-02 |
| T10 | Suppression lot — Vérifier factureLigne nettoyées | API | DATA-01 |
| T11 | Recherche — Recherche accentuée fonctionne (normalisation) | API | DATA-04 |
| T12 | Credits — Suppression crédit fonctionne (liste + détail) | E2E | Regression |
| T13 | Dark mode — Gradient corps pas visible sur fond sombre | Visuel | UI-06 |
| T14 | Toast — Info et avertissement ont couleurs distinctes | Visuel | UI-01 |
| T15 | Import 5000 lignes — Ne timeout pas | Load test | PERF-03 |

### Tests E2E existants à maintenir

Le projet a 20/21 tests E2E passants (`217fbca`). Ces tests couvrent le workflow principal :
- Login → Dashboard → Inventaire → Vente → Caisse → Facture
- Les tests doivent être mis à jour pour couvrir les modules Crédits et Charges

---

## 📋 PLAN D'EXÉCUTION RECOMMANDÉ

| Semaine | Focus | Livrables |
|---------|-------|-----------|
| **S1** | 🔴 Sécurité + i18n labels inversés | 8 fichiers security, 2 fix i18n, 4 tests |
| **S2** | 🔴 Classification unification | 6 fichiers classification, audit DB, 3 tests |
| **S3** | 🔴 Intégrité financière | 4 fichiers caisse/factures, 4 tests |
| **S4** | 🟠 Performance + Données | 5 fichiers perf, 4 fix data, 3 tests |
| **S5** | 🟡 Frontend refactoring | Inventaire split, credits typing, migration page |
| **S6** | 🟡 i18n completion | 5 modules sans i18n, toast amélioré |
| **S7** | 🟡 Design consistency | Icons unification, dark mode fixes, skeleton |
| **S8** | 🟢 Tests + Nettoyage | Tests manquants, scripts consolidation, dead code |

---

*Rapport généré le 2026-09-18 par audit automatisé multi-agents (4 agents, 72K lignes analysées)*
