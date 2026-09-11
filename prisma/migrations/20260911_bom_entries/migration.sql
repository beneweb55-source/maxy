-- CreateTable
CREATE TABLE "bom_entries" (
    "id" SERIAL NOT NULL,
    "produit_parent_id" INTEGER NOT NULL,
    "produit_composant_id" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bom_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bom_entries_produit_parent_id_produit_composant_id_key" ON "bom_entries"("produit_parent_id", "produit_composant_id");

-- CreateIndex
CREATE INDEX "bom_entries_produit_parent_id_idx" ON "bom_entries"("produit_parent_id");

-- CreateIndex
CREATE INDEX "bom_entries_produit_composant_id_idx" ON "bom_entries"("produit_composant_id");

-- AddForeignKey
ALTER TABLE "bom_entries" ADD CONSTRAINT "bom_entries_produit_parent_id_fkey" FOREIGN KEY ("produit_parent_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_entries" ADD CONSTRAINT "bom_entries_produit_composant_id_fkey" FOREIGN KEY ("produit_composant_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
