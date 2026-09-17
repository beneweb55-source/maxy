DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produits' AND column_name = 'est_template') THEN
    ALTER TABLE produits ADD COLUMN est_template BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added est_template';
  ELSE
    RAISE NOTICE 'est_template already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produits' AND column_name = 'template_parent_id') THEN
    ALTER TABLE produits ADD COLUMN template_parent_id INTEGER;
    RAISE NOTICE 'Added template_parent_id';
  ELSE
    RAISE NOTICE 'template_parent_id already exists';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS slot_definitions (
  id SERIAL PRIMARY KEY,
  produit_parent_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  type_composant TEXT NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  obligatoire BOOLEAN NOT NULL DEFAULT true,
  attributs_requis JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT slot_definitions_produit_parent_id_fkey FOREIGN KEY (produit_parent_id) REFERENCES produits(id)
);

CREATE INDEX IF NOT EXISTS idx_slot_definitions_produit_parent_id ON slot_definitions(produit_parent_id);
CREATE INDEX IF NOT EXISTS idx_slot_definitions_type_composant ON slot_definitions(type_composant);

CREATE TABLE IF NOT EXISTS installed_components (
  id SERIAL PRIMARY KEY,
  produit_id INTEGER NOT NULL,
  produit_parent_id INTEGER NOT NULL,
  slot_definition_id INTEGER,
  installed_at TIMESTAMP NOT NULL DEFAULT now(),
  removed_at TIMESTAMP,
  removed_reason TEXT,
  installed_by INTEGER,
  CONSTRAINT installed_components_produit_id_fkey FOREIGN KEY (produit_id) REFERENCES produits(id),
  CONSTRAINT installed_components_produit_parent_id_fkey FOREIGN KEY (produit_parent_id) REFERENCES produits(id),
  CONSTRAINT installed_components_slot_definition_id_fkey FOREIGN KEY (slot_definition_id) REFERENCES slot_definitions(id) ON DELETE RESTRICT,
  CONSTRAINT installed_components_installed_by_fkey FOREIGN KEY (installed_by) REFERENCES users(id),
  CONSTRAINT installed_components_produit_id_produit_parent_id_unique UNIQUE (produit_id, produit_parent_id)
);

CREATE INDEX IF NOT EXISTS idx_installed_components_produit_id ON installed_components(produit_id);
CREATE INDEX IF NOT EXISTS idx_installed_components_produit_parent_id ON installed_components(produit_parent_id);
CREATE INDEX IF NOT EXISTS idx_installed_components_slot_definition_id ON installed_components(slot_definition_id);
