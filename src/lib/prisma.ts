import { PrismaClient } from "@prisma/client";

declare global {
  // Evităm recrearea clientului Prisma în modul hot-reload
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
