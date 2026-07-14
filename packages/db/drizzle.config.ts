import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    // Default matches docker-compose.yml so `npm run db:migrate` works
    // right after `docker compose up -d` with nothing exported.
    url: process.env["DATABASE_URL"] ?? "postgres://rokade:rokade@localhost:5433/rokade",
  },
});
