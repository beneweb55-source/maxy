import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const cats = await prisma.categorie.findMany({ select: { id: true, nom: true, parent_id: true } });
    console.log(JSON.stringify(cats, null, 2));
}
main().finally(() => prisma.$disconnect());
