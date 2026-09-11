import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Chercher la catégorie correcte dans le TREE : MÉMOIRE & PROCESSEURS > Processeurs (CPU) > Processeurs Serveur (Intel Xeon / AMD EPYC)
    const famille = await prisma.categorie.findFirst({
        where: { nom: 'MÉMOIRE & PROCESSEURS', parent_id: null }
    });
    if (!famille) throw new Error('Catégorie racine "MÉMOIRE & PROCESSEURS" introuvable. Exécuter d\'abord apply_classification.ts');

    const catCPU = await prisma.categorie.findFirst({
        where: { nom: 'Processeurs (CPU)', parent_id: famille.id }
    });
    if (!catCPU) throw new Error('Catégorie "Processeurs (CPU)" introuvable');

    const categorie = await prisma.categorie.findFirst({
        where: { nom: 'Processeurs Serveur (Intel Xeon / AMD EPYC)', parent_id: catCPU.id }
    });
    if (!categorie) throw new Error('Sous-catégorie "Processeurs Serveur (Intel Xeon / AMD EPYC)" introuvable');

    const data = `Processeur Intel Xeon Gold 6138 2 GHz	13
Processeur Intel Xeon Gold 6262 1.9 GHz	4
Processeur Intel Xeon Gold 6152 2.10 GHz	6
Processeur Intel Xeon Silver 4110	1
Processeur Intel Xeon Silver 4108 1.8 GHz	1
Processeur Intel Xeon Silver 4208 2.10 GHz	1
Processeur Intel Xeon Silver 4210R 2.40 GHz	2
Processeur Intel Xeon Silver 4210 2.20 GHz	1
Processeur Intel Xeon Gold 5118 2.30 GHz	3
Processeur Intel Xeon W-2102 2.90 GHz	6
Processeur Intel Xeon Bronze 3106 1.7 GHz	3
Processeur Intel Xeon E5-2695 v4 2.10 GHz	4
Processeur Intel Xeon E5-2609 v4	1
Processeur Intel Xeon E5-2620 v4	2
Processeur Intel Xeon E5-2680 v4	3
Processeur Intel Xeon E5-2630 v4	2
Processeur Intel Xeon E5-2609 v3	1
Processeur Intel Xeon E5-2630 v3	2
Processeur Intel Xeon E5-2650 v3	2`;

    const lines = data.split('\n').filter(l => l.trim().length > 0);
    
    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length !== 2) continue;
        const nom = parts[0].trim();
        const qty = parseInt(parts[1].trim(), 10);
        if (isNaN(qty)) continue;

        let modele = await prisma.modele.findFirst({
            where: { nom: nom, categorie_id: categorie.id }
        });
        
        if (!modele) {
            modele = await prisma.modele.create({
                data: {
                    nom: nom,
                    categorie_id: categorie.id,
                    quantite: 0,
                }
            });
        }

        const productsToCreate = Array.from({ length: qty }).map((_, i) => ({
            code_interne: `CPU-XEON-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            reference: nom,
            categorie: 'Processeurs Serveur (Intel Xeon / AMD EPYC)',
            prix_achat: 0,
            modele_id: modele.id,
            categorie_id: categorie.id,
            bom_role: 'component' as const,
            statut: 'recu' as const,
        }));

        if (productsToCreate.length > 0) {
             for (const p of productsToCreate) {
                 await prisma.produit.create({ data: p });
             }
             await prisma.modele.update({
                 where: { id: modele.id },
                 data: { quantite: { increment: qty } }
             });
        }
        console.log(`Inserted ${qty} for ${nom}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
