import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // Don't fail on connection errors during build/runtime initialization
    // Connection will be established lazily on first query
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

