DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT column_name FROM information_schema.columns WHERE table_name = 'produits' AND column_name IN ('est_template','template_parent_id','bom_role','est_compose','parent_id') ORDER BY column_name
  LOOP
    RAISE NOTICE 'produits.%', r.column_name;
  END LOOP;

  FOR r IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('slot_definitions','installed_components') ORDER BY table_name
  LOOP
    RAISE NOTICE 'TABLE: %', r.table_name;
  END LOOP;
END $$;
