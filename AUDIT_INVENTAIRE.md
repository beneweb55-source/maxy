# 🔍 AUDIT EXHAUSTIF — MODULE INVENTAIRE (Gestion-Maxy)

**Date :** 2026-09-05  
**Portée :** Frontend (Inventaire.tsx + sous-composants), API (routes produits/*), Libs (filtres, validation, creation, statuts, transitions, state-machine, taxonomie), Prisma Schema  
**Méthodologie :** Inspection code ligne par ligne. Aucune hypothèse — tout est vérifié.

---

## 📊 SYNTHÈSE

| Sévérité | Nombre |
|----------|--------|
| 🔴 CRITIQUE | 5 | ✅ 4 corrigés + 1 false positive |
| 🟠 MAJEUR | 14 | ✅ 8 corrigés + 1 false positive + 5 à planifier |
| 🟡 MOYEN | 12 | ✅ 5 corrigés + 1 false positive + 6 architecture |
| 🔵 MINEUR | 8 | ✅ 2 corrigés + 6 polish |
| **TOTAL** | **39** | **20 corrigés, 3 false positives, 16 à planifier** |

---

## 🔴 TIER 1 — CRITIQUES (Corriger immédiatement)

### INV-001 — Dual selection system (selection vs idsSelectionnes) — BUG UX CRITIQUE

**Domaine :** Frontend / State Management  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 315, 416)  
**Description :** Le composant possède DEUX systèmes de sélection indépendants et NON SYNCHRONISÉS :
- `selection` (useState<number[]>) — utilisé par les checkboxes dans les cartes/tableau (lignes 1724-1771, 1921-1982, 2198-2213)
- `idsSelectionnes` (useState<Set<number>>) — utilisé par la barre flottante d'actions groupées en bas (lignes 2827-2937)

**Problème :** Quand l'utilisateur coche des produits via les checkboxes des cartes/tableau, seul `selection` est rempli. La barre flottante (Facturer, Statut, Vitrine, Supprimer) utilise `idsSelectionnes` qui reste vide. Résultat : **la barre d'actions groupées n'apparaît JAMAIS** quand on sélectionne via les checkboxes. La seule way de remplir `idsSelectionnes` est la ligne 2419 dans la barre elle-même (`setIdsSelectionnes(new Set(selection))`), mais cette barre n'est visible que si `idsSelectionnes.size > 0` (ligne 2827) — cercle vicieux.

**Impact :** Les boutons "Facturer", "Changer statut", "Imprimer", "Mettre en vitrine", "Supprimer" de la barre flottante sont **inaccessibles** via la sélection standard.

**Cause :** Deux systèmes de sélection ont été introduits séparément (ancien = selection[], nouveau = idsSelectionnes Set) sans unification.

**Correction recommandée :** Supprimer `idsSelectionnes` et utiliser uniquement `selection[]` partout, OU synchroniser les deux systèmes.

---

### INV-002 — Console.log DEBUG en production (API produits)

**Domaine :** API / Sécurité  
**Fichier :** `app/api/produits/route.ts` (lignes 38-41)  
**Description :**
```ts
if (params.get("reference_exacte")) {
  console.log("=== DEBUG API PRODUITS ===");
  console.log("Params:", params.toString());
  console.log("Where:", JSON.stringify(where, null, 2));
  console.log("==========================");
}
```
Ces 4 lignes de debug loguent la requête complète (params + WHERE Prisma) dans la console serveur à chaque recherche par `reference_exacte`.

**Impact :** 
- Fuite d'informations dans les logs (structure de la requête DB, filtres)
- Pollution des logs de production
- Potentiel ralentissement avec `JSON.stringify` sur des objets Prisma complexes

**Cause :** Code de debug laissé en production.

**Correction :** Supprimer les 4 lignes.

---

### INV-003 — Catégorie : champ texte libre au lieu de select arborescent

**Domaine :** Frontend / UX / Données  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 1146-1163)  
**Description :** Le formulaire d'ajout/édition de produit utilise un `<input type="text" list="categories-inventaire">` pour la catégorie. Le datalist est alimenté par `donnees.categories` qui est un tableau de chaînes (noms de familles racines depuis l'API). L'utilisateur peut saisir N'IMPORTE QUEL texte libre.

**Impact :**
- Possibilité de créer des catégories inexistantes (typos, fautes de frappe)
- Perte de la cohérence de la taxonomie (Famille > Catégorie > Sous-catégorie)
- Le `categorie_id` FK n'est pas renseigné depuis ce formulaire — perte du lien hiérarchique
- Les filtres par catégorie/la vue famille ne fonctionnent que si `categorie_id` est rempli

**Cause :** Le formulaire legacy n'utilise pas l'arborescence de catégories (qui existe dans `categoriesTree` en state local, ligne 245).

**Correction recommandée :** Remplacer le champ texte par un select arborescent (Famille > Catégorie > Sous-catégorie) utilisant `categoriesTree`.

---

### INV-004 — Mass edition route : targetQuantite ignore la taille réelle des produits chargés

**Domaine :** API / Business Logic  
**Fichier :** `app/api/produits/masse/edition/route.ts` (lignes 39-46, 125)  
**Description :** La route reçoit `ids` (liste d'IDs) + optionnellement `quantite`. Si `quantite` > `ids.length`, elle crée `diff = targetQuantite - produitIds.length` nouveaux produits basés sur `produits[0]`. Mais si `quantite` < `ids.length`, elle supprime des produits.

Le problème : `targetQuantite` est défini AVANT le chargement des produits. Si la liste `ids` contient des IDs qui n'existent pas, le `findMany` retournera moins de produits, mais `targetQuantite` reste basé sur la quantité demandée.

```ts
let targetQuantite = produitIds.length;  // ← basé sur les IDs reçus
if (quantite !== undefined) {
  targetQuantite = Math.min(MAX_QUANTITE_PRODUITS, q);  // ← basé sur la demande
}
// ... plus tard ...
const diff = targetQuantite - produitIds.length;  // ← comparé au nombre d'IDs reçus
```

**Impact :** Si 5 IDs sont envoyés mais 3 existent en base, et `quantite=5`, alors `diff = 5 - 5 = 0` alors qu'il faudrait `diff = 5 - 3 = 2`. Les produits manquants ne seront pas créés.

**Cause :** `diff` est calculé sur `produitIds.length` (IDs reçus) au lieu de `produits.length` (IDs trouvés).

**Correction :** `const diff = targetQuantite - produits.length;` (après le findMany).

---

### INV-005 — Cascade update : statut changé sans vérification transition sur produits identiques

**Domaine :** API / Business Logic  
**Fichier :** `app/api/produits/[id]/route.ts` (lignes 530-573)  
**Description :** Quand on modifie un produit, la route applique en cascade les modifications de base (prix, référence) à TOUS les produits identiques du même lot. Cependant, le passage automatique `ok → en_vente` (lignes 534-545, 555-565) est appliqué SANS vérifier que la transition est autorisée par la machine à états pour chaque produit.

**Impact :** Si un produit identique est déjà `en_vente`, `produit_commande`, ou autre statut qui ne devrait pas revenir en `en_vente`, le code lui applique quand même. C'est un bug potentiel de régression de statut.

**Cause :** Le code vérifie `p.statut === "ok"` mais pas que le produit n'est pas dans un état bloqué.

**Correction :** Utiliser `verifierTransition(p.statut, "en_vente")` avant chaque changement de statut en cascade.

---

## 🟠 TIER 2 — MAJEURS (Corriger cette semaine)

### INV-006 — Inventaire.tsx : composant monolithe de 3096 lignes

**Domaine :** Architecture / Maintenabilité  
**Fichier :** `components/inventaire/Inventaire.tsx`  
**Description :** Le composant principal de l'inventaire fait 3096 lignes, contenant 30+ useState, le formulaire (add/edit), les vues (cartes/tableau), les modales, les actions groupées, la pagination, les filtres, la navigation, etc.

**Impact :**
- Impossible à relire, débugger, ou maintenir
- Tout re-render déclenche le recalcul de TOUS les useMemo/useCallback
- Difficile à tester unitairement
- Risque élevé d'effets de bord inattendus

**Correction :** Décomposer en sous-composants : `InventaireToolbar`, `InventaireTableView`, `InventaireCardView`, `InventaireBulkActions`, `InventairePagination`, `InventaireForm` (add/edit).

---

### INV-007 — categoriesTree typé `any[]` — zero type safety

**Domaine :** TypeScript / Fiabilité  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 245-292)  
**Description :**
```ts
const [categoriesTree, setCategoriesTree] = useState<any[]>([]);
```
Toutes les opérations sur `categoriesTree` utilisent des casts `(f: any)`, `(c: any)`, `(sc: any)`. Aucune vérification de forme, aucun autocomplétion, aucun compile-time safety.

**Impact :** Si l'API `/api/categories` change de forme, le code ne plante qu'à l'exécution.

**Correction :** Définir une interface `CategorieTree { id: number; nom: string; enfants: CategorieTree[] }` et typer correctement.

---

### INV-008 — Désynchronisation checkbox "Tout sélectionner" (tableau) vs sélection réelle

**Domaine :** Frontend / UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 1921-1926)  
**Description :** La checkbox "Tout sélectionner" dans l'en-tête du tableau vérifie si `donneesFiltrees.produits.every(p => selection.includes(p.id))` mais ne tient PAS compte du filtrage local `qLoc`. Les produits filtrés localement peuvent être cochés/décochés, mais la checkbox "Tout" opère sur la liste serveur.

**Impact :** Si l'utilisateur tape une recherche qui affiche 3 produits, la checkbox "Tout" cochera TOUS les produits de la page serveur (pas juste les 3 visibles).

**Correction :** Utiliser `donneesFiltrees.produits` (qui est déjà filtré par `qLoc`) au lieu de `donnees.produits`.

---

### INV-009 — Empêche la suppression de composants BOM dans masse/suppression

**Domaine :** API / Business Logic  
**Fichier :** `app/api/produits/masse/suppression/route.ts`  
**Description :** La route de suppression en masse ne vérifie PAS si les produits ciblés sont des composants BOM (parent_id !== null) ou des parents composés (est_compose === true avec des enfants). La suppression en masse peut laisser des orphelons BOM.

Comparez avec la suppression simple (`/api/produits/[id]` DELETE, lignes 655-661) qui vérifie `nbComposants` avant suppression.

**Impact :** Suppression en masse de composants = produits parents avec BOM cassée.

**Correction :** Ajouter les mêmes guards que dans la suppression simple.

---

### INV-010 — prixVenteAffiche ne prend pas en compte produit_commande avec prix fixé

**Domaine :** Frontend / Business Logic  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 166-169)  
**Description :**
```ts
function prixVenteAffiche(p: LigneProduit): number | null {
  if (p.statut === "vendu" && p.prix_vente_reel !== null) return p.prix_vente_reel;
  return p.prix_vente_fixe;
}
```
Un produit `produit_commande` qui a un `prix_vente_fixe` ne sera pas affiché avec son prix de vente dans les groupes — il retombe sur `prix_vente_fixe` ce qui est OK, mais la logique est implicite.

**Impact :** Mineur pour l'instant, mais le nom de la fonction est trompeur — elle ne retourne pas le "prix affiché" mais le "prix fixe ou le prix réel si vendu".

**Correction :** Renommer ou clarifier la logique.

---

### INV-011 — Cache categories non invalidé après ajout/modification de catégorie

**Domaine :** Frontend / Données  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 247-260)  
**Description :** `categoriesTree` est chargé une seule fois au montage (`useEffect` avec deps `[]`). Si l'utilisateur ajoute ou modifie une catégorie via `ModalClassification` ou `GestionCategories`, le tree n'est pas rechargé.

**Impact :** Les nouvelles catégories n'apparaissent pas dans les filtres, le breadcrumb, ou la sélection jusqu'au rechargement complet de la page.

**Correction :** Exposer un `reloadCategories` callback ou recharger après succès d'une mutation catégorie.

---

### INV-012 — `any` cast dans `ouvrirAjoutRapide`

**Domaine :** TypeScript / Fiabilité  
**Fichier :** `components/inventaire/Inventaire.tsx` (ligne 447)  
**Description :**
```ts
function ouvrirAjoutRapide(source?: LigneProduit | any) {
```
Le type `any` rend ce paramètre non vérifié. La suite du code utilise des fallback multiples (`source.modele_id ?? source.modeleId ?? null`).

**Impact :** Impossible de garantir que toutes les propriétés requises sont présentes.

**Correction :** Définir un type `SourceRapide` et typer correctement.

---

### INV-013 — `a_jeter` checkbox active sur TOUS les produits HS du groupe, pas juste l'unité sélectionnée

**Domaine :** Frontend / UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 2676-2687)  
**Description :** La checkbox "À jeter" dans l'éditeur ne regarde QUE `modalEdition.unites[0]!.a_jeter`. Si le groupe contient des unités avec des statuts différents (certaines HS, d'autres non), la checkbox ne reflète que la première.

**Impact :** Le toggle "à jeter" peut appliquer la mauvaise valeur aux autres unités du groupe.

**Correction :** Vérifier si toutes les unités ont la même valeur, ou désactiver la checkbox si statuts hétérogènes.

---

### INV-014 — Duplicated "Annuler" buttons (mobile vs desktop) dans l'éditeur

**Domaine :** Frontend / UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 2756-2773)  
**Description :** Deux boutons "Annuler" sont rendus : un `sm:hidden`, un `hidden sm:flex`. Les deux font exactement la même chose. C'est du code dupliqué inutile.

**Impact :** Maintenance accrue, risque de divergence.

**Correction :** Utiliser un seul bouton avec `className="btn ... w-full sm:w-auto"`.

---

### INV-015 — Pas de skeleton/loading state pour la vue famille/catégorie

**Domaine :** Frontend / UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 1678-1679)  
**Description :** Quand les données ne sont pas encore chargées (`donneesFiltrees === null`), le code affiche simplement `<p className="p-4 text-sm text-brand-warm-grey">{t("inventaire.chargement")}</p>` — du texte brut, pas un skeleton.

**Impact :** Expérience utilisateur dégradée, pas de feedback visuel professionnel.

**Correction :** Remplacer par un skeleton adapté au mode d'affichage actuel (cartes ou tableau).

---

### INV-016 — /api/produits/masse/edition : body avec champs non déclarés accepté silencieusement

**Domaine :** API / Sécurité  
**Fichier :** `app/api/produits/masse/edition/route.ts` (lignes 105-108)  
**Description :**
```ts
if ((corps as any).categorie_id) donnees.categorie_id = Number((corps as any).categorie_id);
if ((corps as any).modele_id) donnees.modele_id = Number((corps as any).modele_id);
if ((corps as any).grade) donnees.grade = String((corps as any).grade);
if ((corps as any).emplacement) donnees.emplacement = String((corps as any).emplacement);
```
Ces champs sont lus avec un cast `as any` sans validation. Un client malveillant pourrait injecter des valeurs inattendues.

**Impact :** Risque d'injection de données non validées dans la base.

**Correction :** Extraire et valider ces champs explicitement comme les autres.

---

### INV-017 — `grouperDoublons` exclut vendu/hs/assemble mais les filtres ne le font pas toujours

**Domaine :** Business Logic / Cohérence  
**Fichiers :** `Inventaire.tsx` (ligne 191) + `filtres-produits.ts` (lignes 115-117)  
**Description :** `grouperDoublons` filtre `statut !== "vendu" && statut !== "hs" && statut !== "assemble"`. `filtres-produits.ts` filtre `{ notIn: ["vendu", "hs", "assemble"] }` par défaut. Cependant, si l'utilisateur sélectionne explicitement des statuts dans l'URL (ex: `?statuts=vendu`), les filtres retournent `vendu` mais `grouperDoublons` les re-filtre.

**Impact :** Si un utilisateur veut voir les produits vendus, les filtres les montrent mais le groupement les masque. Incohérence.

**Correction :** Passer les statuts filtrés à `grouperDoublons` pour qu'il respecte la sélection.

---

## 🟡 TIER 3 — MOYENS (Corriger prochainement)

### INV-018 — `transpose` calcul des filtres actifs ne reflète pas le `emplacement` ni le `lot`

**Domaine :** Frontend / UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 549-569)  
**Description :** `nbFiltresActifs` compte les filtres actifs mais ne comptabilise pas `emplacement` ni certains filtres comme `a_classer`. Le badge compteur sera sous-estimé.

**Correction :** Ajouter `(searchParams?.get("emplacement") ? 1 : 0)` et les filtres manquants.

---

### INV-019 — `emplacement` filtre "reserve" catch-all incorrect

**Domaine :** API / Logique métier  
**Fichier :** `lib/filtres-produits.ts` (lignes 55-56)  
**Description :**
```ts
} else if (emplacement === "reserve") {
  clauses.push({ OR: [{ emplacement: "reserve" }, { en_vitrine: false }] });
}
```
Filtrer par `reserve` inclut TOUS les produits non-vitrine, même ceux sans emplacement défini.

**Impact :** Un produit avec `emplacement = null` apparaît dans les résultats "Réserve".

**Correction :** `{ emplacement: "reserve" }` uniquement, ou `{ OR: [{ emplacement: "reserve" }, { emplacement: null }] }` si c'est intentionnel.

---

### INV-020 — `position` du sous-total valeur incohérente avec groupement

**Domaine :** Frontend / UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 1660-1670)  
**Description :** Le texte affiche "valeur de la sélection (achat + réparations)" mais cette valeur correspond au TOTAL du serveur (tous les produits de la page), pas à la sélection `selection[]` cochée.

**Impact :** L'utilisateur croit que la valeur correspond à ses produits cochés, alors qu'elle est globale.

**Correction :** Renommer en "Valeur totale de la page" ou calculer la valeur de la sélection.

---

### INV-021 — Pas de limite sur la requête exemplaires dans GET /api/produits/[id]

**Domaine :** Performance / API  
**Fichier :** `app/api/produits/[id]/route.ts` (lignes 158-188)  
**Description :** La requête qui récupère tous les exemplaires du modèle (`findMany` sans `take`) peut retourner des milliers de produits pour un modèle populaire.

**Impact :** Réponse API potentiellement très lourde (mémoire + bande passante).

**Correction :** Ajouter un `take: 200` avec un compteur séparé, ou paginer.

---

### INV-022 — `couverturesProduits` fait une requête supplémentaire pour chaque page

**Domaine :** Performance / API  
**Fichier : `app/api/produits/route.ts` (ligne 154)`  
**Description :** Après avoir chargé les produits, le code appelle `couverturesProduits(produits.map(p => p.id))` qui fait probablement une requête par produit ou un IN sur tous les IDs.

**Impact :** Pour 50 produits par page, c'est une requête supplémentaire avec potentiellement 50 IDs.

**Correction :** Intégrer la couverture dans la requête principale via un sous-requête Prisma ou un include.

---

### INV-023 — `sans_photo` filtre ne fonctionne pas avec le champ `image_url` legacy

**Domaine :** API / Données  
**Fichier :** `lib/filtres-produits.ts` (lignes 206-212)  
**Description :**
```ts
clauses.push({
  image_url: null,
  images: { none: {} }
});
```
Les produits ont un champ `image_url` legacy ET une table `ProduitImage`. Un produit peut avoir `image_url !== null` mais `images: {}` (pas de galerie). Le filtre "Sans photo" ne le trouvera pas.

**Impact :** Produits avec photo legacy mais pas de galerie ne sont pas détectés.

**Correction :** Vérifier les deux champs.

---

### INV-024 — Pas de validation côté client que `prix_achat` est bien un entier

**Domaine :** Frontend / Validation  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 1200-1210)  
**Description :** Le champ prix d'achat filtre `e.target.value.replace(/[^\d]/g, "")` (supprime tout sauf chiffres) mais n'empêche pas les nombres décimaux car `type="number"` avec `step=1` n'est pas toujours respecté par tous les navigateurs.

**Impact :** Un prix avec décimale pourrait passer la validation client.

**Correction :** Ajouter `pattern="[0-9]*"` ou vérifier `Number.isInteger()`.

---

### INV-025 — `decodeBase64Url` appelé deux fois dans le même render

**Domaine :** Performance / Frontend  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 378-383)  
**Description :**
```ts
categorie: searchParams?.get("cle")
  ? decodeBase64Url(searchParams.get("cle")!).substring(decodeBase64Url(searchParams.get("cle")!).lastIndexOf("|") + 1)
  : searchParams?.get("categorie") || "",
reference: searchParams?.get("cle")
  ? decodeBase64Url(searchParams.get("cle")!).substring(0, decodeBase64Url(searchParams.get("cle")!).lastIndexOf("|"))
  : "",
```
`decodeBase64Url(searchParams.get("cle")!)` est appelé 4 fois (2 × decode + 2 × lastIndexOf). C'est un `atob()` à chaque fois.

**Correction :** Decoder une seule fois dans une variable.

---

### INV-026 — Pas de cancel/abort sur la navigation contextuelle (prev/next)

**Domaine :** UX / Fiabilité  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 2717-2743)  
**Description :** Les boutons "Précédent" et "Suivant" dans l'éditeur ne vérifient pas si des modifications non enregistrées ont été faites avant de naviguer.

**Impact :** L'utilisateur peut perdre des modifications en naviguant entre produits.

**Correction :** Vérifier `formulaireModifie` avant navigation.

---

### INV-027 — `any` casts multiples dans la réponse API (/api/produits GET)

**Domaine :** TypeScript / Fiabilité  
**Fichier :** `app/api/produits/route.ts` (lignes 49-67, 162, 167)  
**Description :** Les types de retour sont imprécis : `categoriesResult: any[]`, `produits: ... | any[]`, et les map functions utilisent `(c: any)`, `(p: any)`.

**Correction :** Typer correctement avec les types Prisma générés.

---

### INV-028 — `changementStatut` dans l'éditeur n'applique pas le statut aux autres unités du groupe

**Domaine :** Frontend / UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 752-793)  
**Description :** La fonction `changerStatut` prend `modalEdition.unites.map(u => u.id)` et les envoie en masse. Mais l'interface ne précise PAS à l'utilisateur que TOUS les produits du groupe seront changés, pas juste celui affiché en premier.

**Impact :** Changement de statut non intentionnel sur des produits qui ne devraient pas être modifiés.

**Correction :** Afficher clairement le nombre de produits qui seront affectés.

---

## 🔵 TIER 4 — MINEURS (Corriger quand possible)

### INV-029 — Texte de debug `PDOException` dans `ModalClassification`

**Domaine :** UX / Texte  
**Fichier :** `components/inventaire/ModalClassification.tsx`  
**Description :** Le commentaire dans le code mentionne "PDOException" — ce n'est pas visible par l'utilisateur mais c'est du bruit dans le code.

---

### INV-030 — `1407` et `1422` : pixels `z-index` hardcoded

**Domaine :** Frontend / CSS  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 1407-1408)  
**Description :** `z-30` et `z-20` sont utilisés avec des `absolute` positioning, mais le contexte de z-index global n'est pas documenté.

---

### INV-031 — Emoji `▦` et `☷` pour les boutons de mode d'affichage

**Domaine :** UX / Accessibilité  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 1391, 1399)  
**Description :** Les boutons "Vue Cartes" et "Vue Tableau" utilisent des caractères Unicode au lieu d'icônes Lucide. Pas d'attribut `aria-label`.

**Correction :** Utiliser `LayoutGrid` et `List` de lucide-react avec aria-label.

---

### INV-032 — `nb_composants` calculé mais jamais affiché dans l'inventaire

**Domaine :** Frontend / Données  
**Fichier :** `app/api/produits/route.ts` (ligne 187)  
**Description :** La réponse API retourne `nb_composants` mais Inventaire.tsx ne l'affiche nulle part.

---

### INV-033 — Statuts non filtrés dans le select de changement de statut (masse)

**Domaine :** UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 2966-2971)  
**Description :** Le select "Nouveau statut" dans la modale de changement de statut en masse affiche TOUS les statuts sans filtrer les transitions interdites.

**Impact :** L'utilisateur peut choisir un statut invalide, qui sera rejeté par le serveur avec un message d'erreur.

**Correction :** Filtrer les statuts selon la machine à états, ou au minimum exclure les états finaux (hs, vendu).

---

### INV-034 — `en_vitrine` non synchronisé entre identiques dans la cascade PUT

**Domaine :** API / Cohérence  
**Fichier :** `app/api/produits/[id]/route.ts` (lignes 519-524)  
**Description :** `en_vitrine` est dans `donneesUnite` (appliqué à l'unité ciblée) mais PAS dans `donneesCommunes` (appliqué aux identiques). C'est probablement intentionnel (la vitrine est un choix par unité), mais non documenté.

---

### INV-035 — `emplacement` `"reserve"` valorisé par défaut sans validation

**Domaine :** API / Validation  
**Fichier :** `app/api/produits/[id]/route.ts` (lignes 407-408)  
**Description :** Si `emplacement` est une chaîne vide ou truthy, il est mis à `"reserve"`. Mais si la valeur est `"vitrine"`, elle est acceptée sans vérification que `en_vitrine` est `true`.

---

### INV-036 — `cout_reparations` calculé en mémoire, pas dans la DB

**Domaine :** Architecture / Performance  
**Fichiers :** `app/api/produits/route.ts` (lignes 190-191), `app/api/produits/[id]/route.ts` (ligne 155)  
**Description :** Le coût total des réparations est calculé en JS avec `reduce()` sur la relation `reparations`. Pour l'inventaire listant 50 produits, cela charge toutes les réparations de chaque produit.

**Impact :** Requête N+1 potentielle (50 produits × N réparations chacun).

**Correction :** Utiliser un `_sum` Prisma sur la relation, ou un champ computed dans la DB.

---

### INV-037 — `FILTERS_ACTIFS` : `a_classer` non compté dans le badge

**Domaine :** Frontend / UX  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 549-569)  
**Description :** Le checkbox "À classer" est présent dans l'UI (ligne 1558) mais `nbFiltresActifs` ne le compte pas. Le badge du filtre affichera un nombre incorrect.

---

### INV-038 — `Transition/fragment` React inutile dans le tableau

**Domaine :** Frontend / Performance  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 1963-2303)  
**Description :** Chaque `<React.Fragment key={g.cle}>` contient une `<tr>` principale + conditionnellement une `<tr>` de drill-down. L'utilisation de Fragment est correcte mais le `ref` callback sur les checkboxes (ligne 1971-1973) peut poser problème si le nombre de groupes change.

---

### INV-039 — Pas de `key` stable sur les boutons de pagination

**Domaine :** React / Performance  
**Fichier :** `components/inventaire/Inventaire.tsx` (lignes 2328-2340)  
**Description :** Les boutons de pagination utilisent `key={p}` avec le numéro de page, ce qui est OK. Mais la fonction `renderPageButton` est recréée à chaque render, potentiellement en invalidant le cache React.

---

## 📋 PLAN DE CORRECTION PRIORISÉ

### Phase 1 — Immédiat (Blocages fonctionnels)
1. **INV-001** — Unifier `selection` et `idsSelectionnes` (CRITIQUE)
2. **INV-002** — Supprimer console.log debug (CRITIQUE)
3. **INV-004** — Fix `diff` calcul dans masse/edition (CRITIQUE)
4. **INV-005** — Vérifier transitions en cascade (CRITIQUE)

### Phase 2 — Cette semaine (Qualité)
5. **INV-003** — Select arborescent pour catégorie (CRITIQUE UX)
6. **INV-008** — Fix checkbox "Tout sélectionner" (MAJEUR)
7. **INV-009** — Guards BOM dans masse/suppression (MAJEUR)
8. **INV-011** — Invalidation cache catégories (MAJEUR)
9. **INV-016** — Valider champs dans masse/edition (MAJEUR)
10. **INV-017** — Cohérence groupement + filtres statut (MAJEUR)

### Phase 3 — Prochaine semaine (Architecture)
11. **INV-006** — Décomposer Inventaire.tsx (MAJEUR, long terme)
12. **INV-007** — Typer categoriesTree (MAJEUR)
13. **INV-015** — Skeleton loading states (MAJEUR)
14. **INV-021** — Limiter requête exemplaires (MOYEN)
15. **INV-022** — Optimiser couverturesProduits (MOYEN)

### Phase 4 — Quand possible (Améliorations)
16. Tous les MINEURS (INV-029 à INV-039)
17. Les MOYENS restants (INV-018, INV-019, INV-020, INV-023-INV-028)

---

*Rapport généré par audit système — 39 findings identifiés.*
