import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({
  path: "apps/api/.env",
});

export default defineConfig({
  schema: "apps/api/prisma/schema.prisma",
  migrations: {
    path: "apps/api/prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});