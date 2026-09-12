import { PrismaClient } from "@prisma/client";
import { NodeEnv } from "../../config.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== NodeEnv.Production) {
  globalForPrisma.prisma = prismaClient;
}
