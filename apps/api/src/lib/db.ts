/**
 * PrismaClient singleton para el backend.
 * Reaprovecha la misma DB SQLite del frontend (desarrollo).
 * En producción: cada servicio tendría su propia conexión a PostgreSQL.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prismaApi: PrismaClient | undefined }

export const db = globalForPrisma.prismaApi ?? new PrismaClient({ log: ['error', 'warn'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaApi = db
