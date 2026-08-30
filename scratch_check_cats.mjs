import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.categorie.findMany({
    include: {
      enfants: true
    }
  });
  console.log("Categories in DB:", JSON.stringify(cats, null, 2));
}

main().finally(() => prisma.$disconnect());
