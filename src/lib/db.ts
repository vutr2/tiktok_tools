import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { checkDatabaseUrl } from "./db-url";

// Chặn lúc khởi động, không để chết giữa lúc chạy. Luật ở db-url.ts (có test).
checkDatabaseUrl(process.env.DATABASE_URL, { envFileExists: existsSync(".env") });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
