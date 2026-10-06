import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import {
  CompensationType,
  UserRole,
} from '../generated/prisma/enums';

config({
  path: resolve(process.cwd(), '.env'),
});

if (!process.env.DATABASE_URL) {
  config({
    path: resolve(
      process.cwd(),
      'apps/api/.env',
    ),
  });
}

async function main(): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_URL;

  const phone =
    process.env.ADMIN_PHONE?.trim();

  const fullName =
    process.env.ADMIN_NAME?.trim() ||
    'مدیر تولیدی باقری';

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is missing',
    );
  }

  if (!phone) {
    throw new Error(
      'ADMIN_PHONE is missing',
    );
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  try {
    const manager = await prisma.user.upsert({
      where: {
        phone,
      },
      update: {
        fullName,
        role: UserRole.MANAGER,
        compensationType:
          CompensationType.NONE,
        isActive: true,
      },
      create: {
        phone,
        fullName,
        role: UserRole.MANAGER,
        compensationType:
          CompensationType.NONE,
        isActive: true,
      },
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        phoneVerifiedAt: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          seeded: true,
          manager,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});