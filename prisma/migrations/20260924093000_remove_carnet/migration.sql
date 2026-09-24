-- Retrait du « Carnet de travail ».
--
-- Décision explicite de l'utilisateur : « Tout, données comprises ». Les deux
-- tables ont été MESURÉES VIDES en production avant d'écrire cette ligne
-- (`SELECT count(*)` → carnet_entrees = 0, carnet_pieces_jointes = 0) : ce DROP
-- ne détruit donc aucun rapport ni aucune pièce jointe réelle.
--
-- Idempotent par construction (IF EXISTS) : la migration peut être rejouée sans
-- erreur sur un environnement qui n'a jamais reçu le carnet, et il n'y a rien à
-- mettre en `CASCADE` — l'ordre enfant → parent suffit à satisfaire la clé
-- étrangère `carnet_pieces_jointes.entree_id → carnet_entrees.id`.

DROP TABLE IF EXISTS "carnet_pieces_jointes";
DROP TABLE IF EXISTS "carnet_entrees";
DROP TYPE IF EXISTS "CarnetCategorie";
