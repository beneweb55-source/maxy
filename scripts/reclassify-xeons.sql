-- ============================================================
-- RECLASSIFICATION DES PRODUITS XEON
-- AVANT: catégorie orpheline "processeur serveur xeon" (racine, sans parent)
-- APRÈS: MÉMOIRE & PROCESSEURS > Processeurs (CPU) > Processeurs Serveur (Intel Xeon / AMD EPYC)
--
-- Idempotent: sûr à exécuter plusieurs fois
-- ============================================================

DO $$
DECLARE
    v_famille_id int;
    v_cat_cpu_id int;
    v_souscat_id int;
    v_updated int := 0;
    v_deleted int := 0;
BEGIN
    -- 1. Trouver le chemin correct dans le TREE
    SELECT id INTO v_famille_id FROM categories WHERE nom = 'MÉMOIRE & PROCESSEURS' AND parent_id IS NULL;
    IF v_famille_id IS NULL THEN
        RAISE NOTICE '⚠️ Catégorie racine "MÉMOIRE & PROCESSEURS" introuvable — migration TREE requise d''abord';
        RETURN;
    END IF;

    SELECT id INTO v_cat_cpu_id FROM categories WHERE nom = 'Processeurs (CPU)' AND parent_id = v_famille_id;
    IF v_cat_cpu_id IS NULL THEN
        RAISE NOTICE '⚠️ Catégorie "Processeurs (CPU)" introuvable';
        RETURN;
    END IF;

    SELECT id INTO v_souscat_id FROM categories WHERE nom = 'Processeurs Serveur (Intel Xeon / AMD EPYC)' AND parent_id = v_cat_cpu_id;
    IF v_souscat_id IS NULL THEN
        -- Créer la sous-catégorie si elle n'existe pas encore
        INSERT INTO categories (nom, parent_id, ordre)
        VALUES ('Processeurs Serveur (Intel Xeon / AMD EPYC)', v_cat_cpu_id, 20)
        RETURNING id INTO v_souscat_id;
        RAISE NOTICE '✅ Sous-catégorie "Processeurs Serveur (Intel Xeon / AMD EPYC)" créée';
    END IF;

    -- 2. Reclasser les produits dont la catégorie texte = "processeur serveur xeon"
    UPDATE produits
    SET categorie_id = v_souscat_id,
        categorie = 'Processeurs Serveur (Intel Xeon / AMD EPYC)'
    WHERE categorie = 'processeur serveur xeon'
       OR categorie_id IN (
           SELECT id FROM categories WHERE nom = 'processeur serveur xeon'
       );
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE '✅ % produits reclassés vers "Processeurs Serveur (Intel Xeon / AMD EPYC)"', v_updated;

    -- 3. Reclasser les modèles orphelins
    UPDATE modeles
    SET categorie_id = v_souscat_id
    WHERE categorie_id IN (
        SELECT id FROM categories WHERE nom = 'processeur serveur xeon'
    );
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE '✅ % modèles reclassés', v_updated;

    -- 4. Supprimer la catégorie orpheline "processeur serveur xeon" (si elle existe et est vide)
    DELETE FROM categories
    WHERE nom = 'processeur serveur xeon'
      AND NOT EXISTS (SELECT 1 FROM produits WHERE categorie_id = categories.id)
      AND NOT EXISTS (SELECT 1 FROM modeles WHERE categorie_id = categories.id);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    IF v_deleted > 0 THEN
        RAISE NOTICE '🗑️ Catégorie orpheline "processeur serveur xeon" supprimée';
    ELSE
        RAISE NOTICE 'ℹ️ Catégorie "processeur serveur xeon" non supprimée (encore des produits/modèles attachés)';
    END IF;

    -- 5. Nettoyer les produits sans categorie_id qui matchent "Xeon" dans le nom
    -- (produits créés par insert_xeons.ts avec ancien schéma)
    UPDATE produits
    SET categorie_id = v_souscat_id,
        categorie = 'Processeurs Serveur (Intel Xeon / AMD EPYC)'
    WHERE (reference ILIKE '%xeon%' OR reference ILIKE '%epyc%')
      AND (categorie_id IS NULL OR categorie_id NOT IN (
          SELECT id FROM categories WHERE nom = 'Processeurs Serveur (Intel Xeon / AMD EPYC)'
      ));
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
        RAISE NOTICE '✅ % produits Xeon/EPYC supplémentaires reclassés par nom', v_updated;
    END IF;

END $$;
