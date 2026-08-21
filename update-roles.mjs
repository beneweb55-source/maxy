import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const imed = await prisma.user.findFirst({
    where: { username: { equals: "imed", mode: "insensitive" } },
  });

  if (!imed) {
    console.error("L'utilisateur Imed n'a pas été trouvé.");
    process.exit(1);
  }

  const roleImed = imed.role;
  console.log(`Le rôle de Imed est : ${roleImed}`);

  const updateResult = await prisma.user.updateMany({
    where: {
      username: { in: ["samy", "raouf"], mode: "insensitive" },
    },
    data: { role: roleImed },
  });

  console.log(`${updateResult.count} utilisateur(s) mis à jour (Samy et Raouf).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
