import "server-only";
import { pool } from "@/lib/db";

export type ProjectSummary = {
  id: string;
  name: string;
  clientName: string;
  budgetCents: number;
  status: string;
  spentCents: number;
  costCount: number;
};

export type Cost = {
  id: string;
  projectId: string;
  category: string;
  supplier: string;
  description: string;
  amountCents: number;
  vatCents: number;
  costDate: string;
  source: string;
  status: string;
};

export type Project = {
  id: string;
  name: string;
  clientName: string;
  budgetCents: number;
  status: string;
};

// pg returns bigint columns as strings, so convert them here.
export async function listProjects(): Promise<ProjectSummary[]> {
  const { rows } = await pool.query(`
    select p.id, p.name, p.client_name, p.budget_cents, p.status,
           coalesce(sum(c.amount_cents), 0) as spent_cents,
           count(c.id)::int as cost_count
    from projects p
    left join costs c on c.project_id = p.id
    group by p.id
    order by p.created_at desc, p.name
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    clientName: row.client_name,
    budgetCents: Number(row.budget_cents),
    status: row.status,
    spentCents: Number(row.spent_cents),
    costCount: row.cost_count,
  }));
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { rows } = await pool.query(
    `select id, name, client_name, budget_cents, status from projects where id = $1`,
    [projectId],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    clientName: row.client_name,
    budgetCents: Number(row.budget_cents),
    status: row.status,
  };
}

export async function listCosts(projectId: string): Promise<Cost[]> {
  const { rows } = await pool.query(
    `select * from costs where project_id = $1 order by cost_date desc, created_at desc`,
    [projectId],
  );
  return rows.map(toCost);
}

export async function getCost(projectId: string, costId: string): Promise<Cost | null> {
  const { rows } = await pool.query(
    `select * from costs where project_id = $1 and id = $2`,
    [projectId, costId],
  );
  return rows[0] ? toCost(rows[0]) : null;
}

type CostRow = {
  id: string;
  project_id: string;
  category: string;
  supplier: string;
  description: string;
  amount_cents: string;
  vat_cents: string;
  cost_date: string;
  source: string;
  status: string;
};

function toCost(row: CostRow): Cost {
  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category,
    supplier: row.supplier,
    description: row.description,
    amountCents: Number(row.amount_cents),
    vatCents: Number(row.vat_cents),
    costDate: row.cost_date,
    source: row.source,
    status: row.status,
  };
}
