import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  try {
    const user = await prisma.user.findUnique({ where: { username: "admin" } });
    console.log("User:", user);
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
