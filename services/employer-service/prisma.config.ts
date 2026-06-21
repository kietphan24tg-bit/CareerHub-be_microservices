import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const prismaGenerateFallbackUrl =
  'postgresql://prisma:prisma@127.0.0.1:5432/careerhub_ci_placeholder';

export default defineConfig({
  datasource: {
    // `prisma generate` only needs a syntactically valid datasource URL.
    // Real migration commands must still provide DIRECT_URL explicitly.
    url: process.env.DIRECT_URL ?? prismaGenerateFallbackUrl
  },
  migrations: {
    path: 'prisma/migrations'
  },
  schema: 'prisma/schema.prisma'
});
