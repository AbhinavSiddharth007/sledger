// Seeds a development database. Wipes projects, costs, documents and invoices first.
// Usage: DATABASE_URL=postgres://... npm run db:seed

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import { VAT_RATE, projects, costs } from "./seed-data.mjs";

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");

const toCents = (eur) => Math.round(eur * 100);

export async function seed(client) {
  await client.query(await readFile(schemaPath, "utf8"));

  await client.query("begin");
  try {
    await client.query("truncate table invoices, costs, documents, projects");

    const projectIds = {};
    for (const project of projects) {
      const { rows } = await client.query(
        `insert into projects (name, client_name, budget_cents, status)
         values ($1, $2, $3, $4) returning id`,
        [project.name, project.clientName, toCents(project.budgetEur), project.status],
      );
      projectIds[project.key] = rows[0].id;
    }

    for (const cost of costs) {
      const project = projects.find((p) => p.key === cost.project);
      const amountCents = toCents(cost.amountEur);
      const vatCents = Math.round(amountCents * VAT_RATE[project.country]);

      await client.query(
        `insert into costs
           (project_id, category, supplier, description, amount_cents, vat_cents,
            cost_date, source, status)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          projectIds[cost.project],
          cost.category,
          cost.supplier,
          cost.description,
          amountCents,
          vatCents,
          cost.costDate,
          cost.source,
          cost.status,
        ],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV is production.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await seed(client);
    console.log(`Seeded ${projects.length} projects and ${costs.length} costs.`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
