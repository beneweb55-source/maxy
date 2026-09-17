import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const SQL = `
-- Vérifier et ajouter est_template
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produits' AND column_name = 'est_template'
  ) THEN
    ALTER TABLE produits ADD COLUMN est_template BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'ADDED: est_template';
  ELSE
    RAISE NOTICE 'EXISTS: est_template';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produits' AND column_name = 'template_parent_id'
  ) THEN
    ALTER TABLE produits ADD COLUMN template_parent_id INTEGER;
    RAISE NOTICE 'ADDED: template_parent_id';
  ELSE
    RAISE NOTICE 'EXISTS: template_parent_id';
  END IF;
END $$;

-- Slot definitions
CREATE TABLE IF NOT EXISTS slot_definitions (
  id SERIAL PRIMARY KEY,
  produit_parent_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  type_composant TEXT NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  obligatoire BOOLEAN NOT NULL DEFAULT true,
  attributs_requis JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'slot_definitions_produit_parent_id_fkey'
  ) THEN
    ALTER TABLE slot_definitions
      ADD CONSTRAINT slot_definitions_produit_parent_id_fkey
      FOREIGN KEY (produit_parent_id) REFERENCES produits(id);
    RAISE NOTICE 'ADDED FK: slot_definitions -> produits';
  ELSE
    RAISE NOTICE 'EXISTS FK: slot_definitions -> produits';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_slot_def_produit ON slot_definitions(produit_parent_id);
CREATE INDEX IF NOT EXISTS idx_slot_def_type ON slot_definitions(type_composant);

-- Installed components
CREATE TABLE IF NOT EXISTS installed_components (
  id SERIAL PRIMARY KEY,
  produit_id INTEGER NOT NULL,
  produit_parent_id INTEGER NOT NULL,
  slot_definition_id INTEGER,
  installed_at TIMESTAMP NOT NULL DEFAULT now(),
  removed_at TIMESTAMP,
  removed_reason TEXT,
  installed_by INTEGER
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installed_comp_produit_fkey'
  ) THEN
    ALTER TABLE installed_components
      ADD CONSTRAINT installed_comp_produit_fkey
      FOREIGN KEY (produit_id) REFERENCES produits(id);
    RAISE NOTICE 'ADDED FK: installed_components.produit_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installed_comp_parent_fkey'
  ) THEN
    ALTER TABLE installed_components
      ADD CONSTRAINT installed_comp_parent_fkey
      FOREIGN KEY (produit_parent_id) REFERENCES produits(id);
    RAISE NOTICE 'ADDED FK: installed_components.produit_parent_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installed_comp_slot_fkey'
  ) THEN
    ALTER TABLE installed_components
      ADD CONSTRAINT installed_comp_slot_fkey
      FOREIGN KEY (slot_definition_id) REFERENCES slot_definitions(id) ON DELETE RESTRICT;
    RAISE NOTICE 'ADDED FK: installed_components.slot_definition_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installed_comp_user_fkey'
  ) THEN
    ALTER TABLE installed_components
      ADD CONSTRAINT installed_comp_user_fkey
      FOREIGN KEY (installed_by) REFERENCES users(id);
    RAISE NOTICE 'ADDED FK: installed_components.installed_by';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installed_comp_unique'
  ) THEN
    ALTER TABLE installed_components
      ADD CONSTRAINT installed_comp_unique
      UNIQUE (produit_id, produit_parent_id);
    RAISE NOTICE 'ADDED UNIQUE: installed_components(produit_id, produit_parent_id)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inst_comp_produit ON installed_components(produit_id);
CREATE INDEX IF NOT EXISTS idx_inst_comp_parent ON installed_components(produit_parent_id);
CREATE INDEX IF NOT EXISTS idx_inst_comp_slot ON installed_components(slot_definition_id);
`;

console.log("🔧 Exécution du SQL de migration...");
try {
  await p.$executeRawUnsafe(SQL);
  console.log("✅ SQL exécuté avec succès.");
} catch (e) {
  console.error("❌ Erreur SQL:", e.message);
}

// Vérification
console.log("\n📋 VÉRIFICATION :\n");

try {
  const cols = await p.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'produits'
    AND column_name IN ('est_template','template_parent_id','bom_role','est_compose','parent_id')
    ORDER BY column_name
  `;
  console.log("Colonnes BOM sur 'produits' :", cols.map(c => c.column_name).join(", "));
} catch (e) { console.error("Erreur colonnes:", e.message); }

try {
  const tables = await p.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('slot_definitions','installed_components')
    ORDER BY table_name
  `;
  console.log("Tables BOM :", tables.map(t => t.table_name).join(", "));
} catch (e) { console.error("Erreur tables:", e.message); }

await p.$disconnect();
console.log("\n✅ Terminé. Redémarrez le serveur : npm run dev");
