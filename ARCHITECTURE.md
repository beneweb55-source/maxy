# ARCHITECTURE.md — Analyse fonctionnelle complète

Document de référence de l'architecture fonctionnelle de **Gestion Maxy** (plateforme de gestion de revente de matériel informatique d'occasion, 4 associés).
Le design est volontairement exclu : ce document ne traite que la logique métier, les flux, les droits et les validations.

**Sources de vérité, par ordre de priorité :**
1. Les décisions d'architecture validées en conversation (schéma Prisma gelé, règles précisées) — priment en cas de conflit.
2. Le cahier des charges v1.0 (juillet 2026) — flux, matrice des droits (§7), spécifications des pages (§6).

Rien dans ce document n'est inventé : chaque règle renvoie au cahier des charges (noté « CDC §x ») ou à une décision explicite (notée « Décision »).

---

## 1. Acteurs et comptes

4 comptes locaux (seed, pas d'inscription publique — CDC §6.1). Aucune authentification externe, aucun cloud : sessions par cookie httpOnly signé, 7 jours (Décision).

### 1.1 Imed — `gerant`

**Responsabilités dans le flux :** étape 1 (arrivage), étape 4 (validation du rapport et décisions), étape 5 (prix de vente), étape 6 (peut vendre), étape 7 (répartition mensuelle).

| | |
|---|---|
| **Modules accessibles** | Tous : Dashboard (total), Arrivages, Inventaire, Fiches, Rapports, Ventes, Caisse, Paramètres, Notifications (les siennes) |
| **Actions autorisées** | Créer un lot **avec ses produits** (CDC §4 étape 1) · prendre les décisions produit par produit · valider un rapport · fixer les prix (`ok → en_vente`) · enregistrer une vente · **annuler une vente** (motif obligatoire) · créer les mouvements manuels de caisse · appliquer la répartition mensuelle · modifier les paramètres (marge min, objectif réserve) · modifier les statuts produits (Inventaire « Total », CDC §7) · exporter le CSV inventaire et caisse · notes libres |
| **Actions interdites** | Ajouter des produits à un lot déjà créé (CDC §7 : réservé à Raouf — Décision : Imed saisit les produits **à la création uniquement**) · créer des mouvements de type système (`achat_lot`, `vente`, `annulation_vente` : système seul) · supprimer quoi que ce soit (interdit pour tous) |
| **Notifications reçues** | Rapport prêt · vente enregistrée · stock +30 j · vente annulée (tous) |

### 1.2 Raouf — `technicien`

**Responsabilités dans le flux :** étape 2 (test produit par produit), étape 3 (clôture du lot). Travaille **depuis son téléphone à l'atelier** : l'écran technicien est mobile first (CDC §13.1).

| | |
|---|---|
| **Modules accessibles** | Dashboard (lecture, **sans KPI cash** — Décision, cohérent avec Caisse ✗) · Arrivages (liste, détail lot, écran technicien) · Inventaire + Fiches (modifier les statuts) · Rapports (lecture) · Notifications (les siennes) |
| **Actions autorisées** | Passer les produits `recu → en_test` puis vers `ok / a_reparer / manque_piece / hs` (note obligatoire pour les 3 derniers) · `manque_piece → a_reparer` · `a_reparer → ok` · ajouter des réparations avec coût · **clôturer un lot** (impossible s'il reste un `recu`) · **ajouter des produits oubliés** à un lot `en_cours_de_test` (CDC §7 + Décision) · notes libres |
| **Actions interdites** | Créer un lot · valider un rapport ou prendre les décisions · fixer un prix · enregistrer ou annuler une vente · **tout accès Caisse (ni lecture, ni écriture, ni entrée de navigation)** (CDC §7) · exports CSV |
| **Notifications reçues** | Nouveau lot · rapport validé · vente annulée (tous) |

### 1.3 Samy et Louay — `dev`

**Responsabilités dans le flux :** étape 6 (enregistrer les ventes). Rôle : lecture générale + enregistrement des ventes (Décision, conforme CDC §7).

| | |
|---|---|
| **Modules accessibles** | Dashboard (total) · Arrivages (lecture) · Inventaire + Fiches (lecture) · Rapports (lecture) · Ventes · Caisse (**lecture seule**) · Notifications (les siennes) |
| **Actions autorisées** | Enregistrer une vente (avec gestion `confirmation_required` marge minimum) · notes libres sur les fiches produits (CDC §6.5 : tous rôles) · export CSV caisse (lecture) |
| **Actions interdites** | Créer un lot ou des produits · changer un statut · ajouter une réparation · clôturer/valider · fixer un prix · annuler une vente · écrire en caisse · répartition · paramètres · export CSV inventaire (Imed seul, CDC §6.4) |
| **Notifications reçues** | Vente annulée (tous) |

---

## 2. Modules fonctionnels

Neuf modules. Les écritures à effets multiples sont **toujours** des transactions Prisma atomiques (Décision) : jamais d'état à moitié écrit.

### 2.1 Authentification & sessions
- **Rôle :** identifier l'utilisateur et vérifier son rôle sur **chaque** endpoint (le masquage frontend ne sécurise jamais seul — CDC §7).
- **Règles :** message d'échec unique (ne jamais révéler si l'identifiant ou le mot de passe est faux) · blocage 5 tentatives / 5 minutes (`login_attempts`, `locked_until`) · redirection automatique si session absente/expirée.
- **Interactions :** tous les modules dépendent de lui (`exigerUtilisateur(roles)` en tête de chaque endpoint).

### 2.2 Lots & arrivages
- **Rôle :** entrée de la marchandise dans le système.
- **Responsabilités :** création lot + produits (Imed), génération des `code_interne` (P-0001…), liste avec progression « 7/12 testés », ajout de produits oubliés (Raouf, lot `en_cours_de_test` seulement).
- **Effets automatiques à la création (une transaction) :** lot + produits + historiques `null → recu` + mouvement `achat_lot` (montant = **Σ des prix d'achat saisis** — Décision ; le coût global déclaré ne sert qu'à afficher l'écart) + notification à Raouf.
- **Données :** `lots`, `produits`, `historique_statuts`, `mouvements_caisse`, `notifications`.

### 2.3 Tests & statuts (écran technicien)
- **Rôle :** faire avancer chaque produit dans sa machine à états (§3), depuis mobile, en 1 tap.
- **Responsabilités :** transitions strictement validées côté serveur, note obligatoire contextuelle, historisation systématique (qui, quand, avant → après, note), réparations à coûts multiples, clôture du lot.
- **Interactions :** clôture → module Rapports (génération) + Notifications (Imed).

### 2.4 Rapports & décisions
- **Rôle :** synthèse d'un lot testé et prise de décision du gérant.
- **Responsabilités :** un rapport par lot clôturé, généré automatiquement (résumé par statut : nb produits + valeur d'achat par catégorie — CDC §6.6) · décisions produit par produit pour chaque `a_reparer / manque_piece / hs` · **validation bloquée tant qu'une décision manque** · vue impression A4 sans navigation.
- **Effets à la validation (une transaction) :** `reparer` → statut inchangé (file de réparation) · `vendre_en_etat` → `ok` (historisé, note automatique) · `pieces_detachees` → `hs` si pas déjà (historisé) · lot → `valide` · notification à Raouf.

### 2.5 Inventaire & fiche produit
- **Rôle :** retrouver n'importe quel produit et connaître toute sa vie.
- **Responsabilités :** recherche texte (référence, notes) + filtres combinables (statuts multiples, catégorie, lot, période, +30 j) · compteur + valeur de la sélection · tri · pagination 50 · export CSV (Imed) · fiche : identité / finances (marge auto = réel − achat − Σ réparations) / timeline complète / notes libres.
- **Règle clé :** produit `vendu` = lecture seule, **sauf notes libres** (CDC §5 et §6.5).

### 2.6 Ventes
- **Rôle :** transformer un produit `en_vente` en argent, tracer, et savoir annuler proprement.
- **Responsabilités :** onglet « En vente » (prix fixé, marge prévue, jours en vente) · modal de vente (prix pré-rempli, canal libre : Ouedkniss, Facebook, direct…) · garde-fou marge minimum → `confirmation_required` · historique avec marges, filtres mois/vendeur, totaux · annulation (Imed, motif obligatoire).
- **Effets d'une vente (une transaction) :** ligne `ventes` (source de vérité) + produit `vendu` avec dénormalisation `prix_vente_reel`/`date_vente` + historique + mouvement `vente` + notification Imed.
- **Effets d'une annulation (une transaction) :** `annulee=true` + motif + contre-passation `annulation_vente` + produit → `en_vente` (dénormalisation remise à null, historisé) + notification aux 4. **La ligne de vente reste** (zéro suppression).

### 2.7 Caisse, répartition & paramètres
- **Rôle :** registre financier unique ; rien ne s'y supprime jamais.
- **Responsabilités :** 3 soldes (total / réserve avec barre objectif / disponible) · mouvements manuels (Imed : `apport_associe`, `achat_piece`, `frais`, `retrait_parts`, `transfert_reserve`) · `solde_apres` figé à l'insertion, jamais recalculé · graphique solde 6 mois + export CSV · répartition mensuelle · paramètres (marge min %, objectif réserve — Imed seul).
- **Logique centralisée :** le sens de chaque type (entrée/sortie/neutre) vit dans **une seule fonction** (`lib/caisse.ts`), utilisée par le seed, les endpoints et le dashboard (Décision). `transfert_reserve` et `reinvest` sont neutres (déplacements d'enveloppes). Réserve = Σ `transfert_reserve` ; disponible = total − réserve.
- **Répartition mensuelle (Décision) :** base = **Σ des marges des ventes non annulées du mois calendaire** · 4 mouvements : réinvest 50 % (neutre) + réserve 20 % + parts 20 % (`retrait_parts`) + frais 10 % · si réserve < objectif : les parts partent en réserve à la place, avec `confirmation_required` (CDC §10.2) · une seule répartition par mois (marqueur `repartition:AAAA-MM` → 409).
- **Garde-fou réserve (CDC §10.1 + Décision) :** toute sortie qui rendrait total < réserve exige `confirmation_required` (la réserve ne s'entame que par confirmation explicite d'Imed).

### 2.8 Notifications
- **Rôle :** que chaque associé sache immédiatement ce qui le concerne, sans surveiller l'application.
- **Événements (CDC §6.9) :** nouveau lot → Raouf · rapport prêt → Imed · rapport validé → Raouf · vente → Imed · vente annulée → tous · stock +30 j → Imed.
- **Responsabilités :** cloche header (badge non-lues) · dropdown 10 dernières · clic = page concernée + marque lue · page complète · tout marquer lu · chacun ne voit que les siennes.
- **Génération des alertes temporelles :** vérification paresseuse à la première requête authentifiée du jour, sans doublon (Décision — pas d'infrastructure cron).

### 2.9 Dashboard
- **Rôle :** poste de pilotage **actionnable** (voir §6) : 4 KPI avec variation vs mois précédent (bénéfice du mois, cash disponible, valeur du stock, temps de stock moyen) · graphique bénéfices 6 mois · donut stock par statut (clic → inventaire filtré) · alertes (+30 j, `manque_piece` +14 j) · 10 dernières activités (qui + quand).
- **Restriction :** technicien = lecture sans KPI cash ni activités de caisse.

---

## 3. Machines à états (validées côté serveur, sans exception)

### 3.1 Produit

```
null ──création──▶ recu ──▶ en_test ──▶ ok ──prix (Imed)──▶ en_vente ──vente──▶ vendu
                              │                                  ▲│
                              ├──▶ a_reparer ──réparé──▶ ok      ││ annulation (Imed)
                              ├──▶ manque_piece ──▶ a_reparer    │▼
                              └──▶ hs                          (retour en_vente)
```

- Toute autre transition → **400 avec message explicite**.
- Note **obligatoire** vers `a_reparer`, `manque_piece`, `hs` (décrire le défaut / la pièce / la raison — CDC §5).
- Transitions système supplémentaires, uniquement via la validation du rapport : `vendre_en_etat` → `ok` ; `pieces_detachees` → `hs` (historisées avec note automatique).
- `vendu` = verrouillé : aucune modification sauf notes libres. Le retour `vendu → en_vente` n'existe que par l'annulation de vente (jamais par l'endpoint statut).
- **Chaque** changement est historisé, y compris la création (`null → recu`).

### 3.2 Lot

```
en_cours_de_test ──clôture (Raouf, aucun produit recu)──▶ teste ──validation (Imed, toutes décisions prises)──▶ valide
```

---

## 4. Gestion des données

| Entité | Créée par | Modifiée par | Supprimée par | Consultée par |
|---|---|---|---|---|
| `users` | seed uniquement | système (tentatives/blocage) | personne | — (jamais exposé) |
| `lots` | Imed | système (statut) | personne | tous |
| `produits` | Imed (création lot) · Raouf (ajout sur lot en test) | Raouf/Imed (statuts) · Imed (prix) · système (vente/annulation) · tous (notes) | personne | tous |
| `reparations` | Raouf (Imed possible, « Total ») | personne (ajout uniquement) | personne | tous |
| `historique_statuts` | système uniquement | personne | personne | tous |
| `ventes` | Imed, Samy, Louay | Imed (annulation seule : `annulee`, motif) | personne — **la ligne reste** | tous |
| `mouvements_caisse` | système (`achat_lot`, `vente`, `annulation_vente`) · Imed (manuels, répartition) | personne | personne | Imed, Samy, Louay (**pas Raouf**) |
| `notifications` | système | destinataire (marquer lue) | personne | chacun les siennes |
| `parametres` | seed | Imed | personne | tous (lecture) |

- **Zéro suppression, partout** (CDC §13.1) : tout se trace ou se contre-passe.
- **Exports :** CSV inventaire = Imed · CSV caisse = Imed + devs (rôles lecteurs de la caisse).
- **Dénormalisation contrôlée :** `produits.prix_vente_reel` / `date_vente` sont recopiés depuis `ventes` **dans la même transaction** (facilite l'inventaire) ; `ventes` reste la source de vérité.

---

## 5. Validation des actions (contrôles, confirmations, erreurs)

Conventions : erreurs `{ "error": "message lisible en français" }` · 400 validation · 401 non connecté · 403 rôle insuffisant · 404 introuvable · 409 conflit · confirmations `{ "confirmation_required": true }` → renvoi avec `"confirmer": true`. Monnaie : entiers DZD.

| Action | Qui | Contrôles bloquants | Confirmation | Effets (une transaction) |
|---|---|---|---|---|
| Connexion | tous | 5 échecs → blocage 5 min (429) ; message d'échec unique | — | compteur tentatives |
| Créer un lot | Imed | fournisseur requis · ≥ 1 produit · référence/catégorie/prix d'achat (entier ≥ 0) par ligne · écart vs coût déclaré = **affiché, non bloquant** | — | lot + produits + historiques + `achat_lot` + notif Raouf |
| Ajouter produits | Raouf | lot `en_cours_de_test` uniquement (sinon 400) | — | produits + historiques (le mouvement de caisse du lot n'est pas modifié) |
| Changer un statut | Raouf, Imed | transition autorisée (sinon 400 explicite) · note obligatoire vers les 3 statuts défauts · produit non `vendu` | — | statut + historique |
| Ajouter une réparation | Raouf, Imed | coût entier > 0 · description obligatoire · produit non `vendu` | — | ligne `reparations` |
| Clôturer un lot | Raouf | aucun produit `recu` (sinon 400 et bouton désactivé côté UI) | — | lot `teste` + notif Imed |
| Enregistrer les décisions | Imed | produits en `a_reparer`/`manque_piece`/`hs` du lot `teste` uniquement | — | `decision_rapport` par produit |
| Valider le rapport | Imed | toutes les décisions prises (sinon 400) | — | effets des décisions (historisés) + lot `valide` + notif Raouf |
| Fixer le prix | Imed | produit `ok` uniquement · prix entier > 0 | — | `prix_vente_fixe` + `ok → en_vente` historisé |
| Enregistrer une vente | Imed, devs | produit `en_vente` uniquement · prix entier > 0 | prix < (achat + Σ répar.) × (1 + marge %) → modale | vente + produit `vendu` (dénormalisé) + historique + mouvement `vente` + notif Imed |
| Annuler une vente | Imed | motif obligatoire · vente non déjà annulée (409) | — | `annulee=true` + contre-passation + produit `en_vente` (dénorm. annulée) + historique + notif tous |
| Mouvement manuel | Imed | type manuel uniquement (jamais `achat_lot`/`vente`/`annulation_vente`) · montant entier > 0 | sortie rendant total < réserve → modale | mouvement + `solde_apres` calculé en transaction |
| Répartition mensuelle | Imed | bénéfice du mois > 0 (sinon 400 « aucun bénéfice à répartir ») · pas déjà faite ce mois (409) | réserve < objectif → parts vers réserve, modale | 4 mouvements (`reinvest`, `transfert_reserve`, `retrait_parts` ou 2ᵉ `transfert_reserve`, `frais`) |
| Paramètres | Imed | marge 0–100 entier · objectif ≥ 0 entier | — | mise à jour `parametres` |
| Note libre | tous | — (seule écriture permise sur un produit vendu) | — | champ `notes` |

Chaque composant d'interface gère 3 états : chargement / données / erreur — jamais d'écran vide inexpliqué. Toute erreur API affiche son message français (toast ou inline).

---

## 6. Principe « Dashboard actionnable » (contrainte d'architecture)

Le Dashboard et les pages métier forment **un seul poste de travail** : chaque information affichée mène directement à l'action correspondante, dans la structure des pages validée (CDC §6). Concrètement — sans rien inventer, uniquement en reliant l'existant :

**Pour tous :**
- Donut du stock → clic sur un segment = inventaire déjà filtré sur ce statut (CDC §6.2).
- Chaque alerte (+30 j, manque_piece +14 j) → clic = fiche du produit concerné.
- Chaque activité récente → clic = fiche produit / lot / vente concernés.
- Chaque notification → clic = page concernée + marquée lue (CDC §6.9).

**Imed (décide) :** rapport prêt visible dès la clôture (notification + lien direct) → page de décisions → à la validation, les produits `ok` sont immédiatement accessibles pour fixer les prix → chaque fixation de prix bascule le produit dans Ventes. Zéro recherche manuelle entre deux étapes du flux.

**Raouf (exécute à l'atelier) :** notification « nouveau lot » → écran technicien mobile → statut en 1 tap avec note contextuelle → le bouton Clôturer s'active seul quand tout est testé. La file de réparation (produits `a_reparer` / décision `reparer`) reste accessible depuis l'inventaire filtré.

**Samy / Louay (vendent) :** onglet « En vente » = cartes prêtes à vendre (prix fixé, marge prévue, jours en vente) → modal de vente pré-remplie → confirmation de marge le cas échéant. Une vente = un clic + une confirmation.

**Parcours courts garantis :** l'utilisateur sait toujours où il est (navigation persistante, page active marquée), ce qu'il peut faire (seules les actions de son rôle sont visibles — et re-vérifiées côté serveur), ce qu'il vient de faire (toast de confirmation + historique/activités), ce qui suit (l'étape suivante du flux est le lien le plus visible).

---

## 7. Points signalés (non inventés, tranchés explicitement)

| Point | Statut |
|---|---|
| CDC §4 (« Imed saisit les produits ») vs §7 (« ajouter produits : Raouf ») | **Tranché** : Imed crée le lot avec ses produits ; Raouf complète un lot encore en test |
| CDC §4 étape 6 (« Vente : Tous ») vs §7 (« Ventes — enregistrer : Raouf ✗ ») | **Tranché** : la matrice §7 prime — Raouf ne vend pas |
| Base de calcul de la répartition (« bénéfices ») | **Tranché** : Σ marges des ventes non annulées du mois calendaire |
| Montant du mouvement `achat_lot` | **Tranché** : Σ des prix d'achat saisis |
| Pas de table session dans le schéma gelé | **Tranché** : cookie signé HMAC stateless |
| Alertes temporelles sans cron | **Tranché** : vérification paresseuse quotidienne |
| Répartition avec bénéfice nul ou négatif | **Proposé** : refus avec message explicite (« Imed vérifie les chiffres avant d'appliquer », CDC §10.2) — à confirmer si un autre comportement est souhaité |
| « Temps de stock moyen » (KPI) | **Implémenté** : moyenne des jours depuis `date_entree` des produits non vendus — signaler si une autre définition est attendue |

**Hors périmètre V1 (CDC §3.2 et §6.9) :** application mobile native · comptabilité officielle / banque · e-commerce · multi-entrepôts · bot Telegram (V1.5). Le déploiement (Railway/Vercel) est la phase finale du planning, hors livrable local actuel.
