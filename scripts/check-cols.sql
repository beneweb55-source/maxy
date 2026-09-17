SELECT column_name FROM information_schema.columns WHERE table_name = 'produits' AND column_name IN ('est_template','template_parent_id','bom_role','est_compose','parent_id') ORDER BY column_name;
