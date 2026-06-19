import { PrismaClient } from "@prisma/client";

/** Incrementar si cambia schema.prisma y hace falta nuevo cliente en dev (sin reiniciar todo el PC). */
const CLIENT_CACHE_KEY = "prisma_ccp_v6";

type GlobalPrisma = typeof globalThis & {
  [CLIENT_CACHE_KEY]?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrisma;

export const prisma =
  globalForPrisma[CLIENT_CACHE_KEY] ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[CLIENT_CACHE_KEY] = prisma;
}
