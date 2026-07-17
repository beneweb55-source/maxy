# API.md — Contrat des endpoints

Conventions (cahier des charges §11) :

- Base URL : `/api` — JSON exclusivement.
- Auth : cookie de session httpOnly signé — **le rôle est vérifié côté serveur sur chaque endpoint**.
- Monnaie : entiers DZD. Dates : ISO 8601 (`YYYY-MM-DD`, timestamps `YYYY-MM-DDTHH:mm:ssZ`).
- Erreurs : toujours `{ "error": "message lisible en français" }` avec le code HTTP adapté (400 validation, 401 non connecté, 403 rôle insuffisant, 404 introuvable, 409 conflit).
- Confirmation : réponse `{ ..., "confirmation_required": true }` → l'UI affiche une modale et renvoie la même requête avec `"confirmer": true`.

Rôles : `gerant` (Imed) · `technicien` (Raouf) · `dev` (Samy, Louay). Ce document sera complété au fil des phases — chaque endpoint livré doit y figurer.

## Auth (Phase 1)

| Méthode | Endpoint | Rôles | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ username, password }` → `{ user: { id, username, role } }`. Message d'erreur unique (jamais préciser identifiant ou mot de passe). Blocage 5 tentatives / 5 min → 429. |
| POST | `/api/auth/logout` | connecté | Détruit le cookie de session. |
| GET | `/api/auth/me` | connecté | `{ user }` courant, 401 sinon. |

## Lots & rapports (Phases 2-4)

| Méthode | Endpoint | Rôles | Description |
|---|---|---|---|
| GET | `/api/lots` | tous connectés | Liste : n°, date, fournisseur, nb produits, progression testés, statut. |
| POST | `/api/lots` | gerant | Crée lot + produits + historiques (null→recu) + mouvement `achat_lot` (Σ prix_achat) + notification technicien — **une transaction**. |
| GET | `/api/lots/:id` | tous connectés | Détail lot + produits (cartes écran technicien). |
| POST | `/api/lots/:id/produits` | technicien | Ajout de produits à un lot `en_cours_de_test` (produits oubliés). |
| POST | `/api/lots/:id/cloture` | technicien | 400 s'il reste un produit `recu`. Lot → `teste` + notification gérant — une transaction. |
| GET | `/api/rapports` | tous connectés | Lots `teste` / `valide` avec résumé. |
| GET | `/api/rapports/:lotId` | tous connectés | Rapport : résumé par statut, produits avec notes, décisions. |
| PUT | `/api/rapports/:lotId/decisions` | gerant | Enregistre `decision_rapport` produit par produit (`reparer` / `vendre_en_etat` / `pieces_detachees`). |
| POST | `/api/rapports/:lotId/validation` | gerant | 400 si une décision manque. Applique les effets (vendre_en_etat→ok, pieces_detachees→hs, historisés), lot → `valide`, notification technicien — une transaction. |

## Produits (Phases 3-6)

| Méthode | Endpoint | Rôles | Description |
|---|---|---|---|
| GET | `/api/produits` | tous connectés | Inventaire : recherche texte, filtres combinables (statuts multi, catégorie, lot, période, +30j), tri, pagination 50, compteur + valeur de la sélection. |
| POST | `/api/produits` | gerant | `{ lot_id, reference, categorie, prix_achat }` — ajout direct d'un produit à un lot existant depuis l'inventaire. Statut initial `recu`, historisé. Pas de mouvement de caisse. |
| GET | `/api/produits/:id` | tous connectés | Fiche complète : identité, finances, réparations, timeline historique, ventes. |
| PUT | `/api/produits/:id` | gerant | `{ reference?, categorie?, prix_achat? }` — modification descriptive. 400 si produit vendu (fiche verrouillée). Ne recalcule jamais le mouvement `achat_lot`. |
| DELETE | `/api/produits/:id` | gerant | Retrait définitif (avec historique de statuts et réparations). 400 dès qu'une vente ou un mouvement de caisse est lié : l'historique financier ne se supprime jamais. |
| POST | `/api/produits/:id/statut` | technicien, gerant | `{ statut, note? }`. Transitions strictes : recu→en_test · en_test→ok\|a_reparer\|manque_piece\|hs · manque_piece→a_reparer · a_reparer→ok. Note obligatoire vers a_reparer/manque_piece/hs. Produit vendu verrouillé. Historisé — une transaction. |
| POST | `/api/produits/:id/reparations` | technicien, gerant | `{ cout, description }` — produit non vendu. |
| POST | `/api/produits/:id/prix` | gerant | `{ prix_vente_fixe }` — produit `ok` → `en_vente`, historisé — une transaction. |
| PATCH | `/api/produits/:id/notes` | tous connectés | Note libre — seule modification autorisée sur un produit vendu. |
| GET | `/api/produits/export` | gerant | CSV de la vue filtrée (mêmes paramètres que GET /api/produits). |

## Ventes (Phase 7)

| Méthode | Endpoint | Rôles | Description |
|---|---|---|---|
| GET | `/api/ventes` | tous connectés | Historique avec marges, filtres mois/vendeur, totaux. |
| POST | `/api/ventes` | gerant, dev | `{ produit_id, prix_vente_reel, canal?, date_vente?, confirmer? }` — produit `en_vente` uniquement. `date_vente` (AAAA-MM-JJ, jamais future) : aujourd'hui par défaut. Si prix < (achat + Σ réparations) × (1 + marge_min%) → `confirmation_required`. Sinon : vente + produit `vendu` (dénormalisation prix/date) + historique + mouvement `vente` + notification gérant — une transaction. |
| POST | `/api/ventes/:id/annulation` | gerant | `{ motif }` obligatoire. `annulee=true` + contre-passation `annulation_vente` + produit → `en_vente` (historisé, dénormalisation remise à null) + notification aux 4 — une transaction. La ligne de vente reste. |

## Caisse & paramètres (Phase 8)

| Méthode | Endpoint | Rôles | Description |
|---|---|---|---|
| GET | `/api/caisse` | gerant, dev | 3 soldes (total, réserve, disponible), historique paginé avec `solde_apres`, données graphique 6 mois. **Interdit au technicien.** |
| POST | `/api/caisse/mouvements` | gerant | Types manuels uniquement (`apport_associe`, `achat_piece`, `frais`, `retrait_parts`, `transfert_reserve`). Sortie qui rendrait total < réserve → `confirmation_required`. `solde_apres` calculé en transaction. |
| POST | `/api/caisse/repartition` | gerant | Base = Σ marges des ventes non annulées du mois. 4 mouvements : réinvest 50 % (neutre) · réserve 20 % · parts 20 % (`retrait_parts`, ou `transfert_reserve` si réserve < objectif → `confirmation_required`) · frais 10 %. Marqueur `repartition:AAAA-MM` → une seule par mois (409). |
| GET | `/api/caisse/export` | gerant, dev | Export CSV des mouvements. |
| GET | `/api/parametres` | tous connectés | `{ marge_minimum_pct, objectif_reserve }`. |
| PUT | `/api/parametres` | gerant | Modification des deux paramètres. |

## Administration (Phase 11)

| Méthode | Endpoint | Rôles | Description |
|---|---|---|---|
| GET | `/api/admin` | gerant | Aperçu du panel : soldes de caisse, paramètres, compteurs par table (lots, produits, ventes, mouvements…), dernier mouvement, état des comptes (tentatives, verrouillage). |
| POST | `/api/admin/caisse` | gerant | `{ nouveau_solde, motif, confirmer? }` — ajustement du solde total. Crée le mouvement compensatoire tracé (`apport_associe` si hausse, `frais` si baisse). Toujours `confirmation_required` au premier appel. |
| POST | `/api/admin/utilisateurs/:id/deverrouillage` | gerant | Remise à zéro du verrouillage de connexion (tentatives + date). |
| POST | `/api/admin/reinitialisation` | gerant | `{ confirmation: "REINITIALISER" }` — vide toutes les données métier (lots, produits, ventes, réparations, mouvements, notifications). Comptes et paramètres conservés. |

## Dashboard & notifications (Phases 9-10)

| Méthode | Endpoint | Rôles | Description |
|---|---|---|---|
| GET | `/api/dashboard` | tous connectés | 4 KPI + variations vs mois précédent, bénéfices 6 mois, donut stock par statut, alertes (+30j, manque_piece +14j), 10 dernières activités. KPI cash masqué pour le technicien. |
| GET | `/api/notifications` | connecté | Les siennes uniquement. `?limit=10` pour le dropdown. Badge = nb non lues. |
| POST | `/api/notifications/:id/lu` | connecté | Marque lue (403 si pas la sienne). |
| POST | `/api/notifications/tout-lu` | connecté | Marque toutes ses notifications lues. |
