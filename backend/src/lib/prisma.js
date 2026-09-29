const { PrismaClient } = require("@prisma/client");

// Instancia unica do Prisma Client, reaproveitada em toda a aplicacao
// (evita esgotar conexoes com o banco em ambientes serverless/hot-reload).
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
