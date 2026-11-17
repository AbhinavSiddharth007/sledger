import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type CostRow = Database["public"]["Tables"]["costs"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

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

export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = unwrap(
    await getSupabaseAdmin()
      .from("projects")
      .select("id, name, client_name, budget_cents, status, costs(amount_cents)")
      .order("created_at", { ascending: false })
      .order("name"),
  ) ?? [];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    clientName: row.client_name,
    budgetCents: row.budget_cents,
    status: row.status,
    spentCents: row.costs.reduce((sum, cost) => sum + cost.amount_cents, 0),
    costCount: row.costs.length,
  }));
}

export async function getProject(projectId: string): Promise<Project | null> {
  const row = unwrap(
    await getSupabaseAdmin()
      .from("projects")
      .select("id, name, client_name, budget_cents, status")
      .eq("id", projectId)
      .maybeSingle(),
  );
  return row ? toProject(row) : null;
}

export async function listCosts(projectId: string): Promise<Cost[]> {
  const rows = unwrap(
    await getSupabaseAdmin()
      .from("costs")
      .select("*")
      .eq("project_id", projectId)
      .order("cost_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ) ?? [];
  return rows.map(toCost);
}

export async function getCost(projectId: string, costId: string): Promise<Cost | null> {
  const row = unwrap(
    await getSupabaseAdmin()
      .from("costs")
      .select("*")
      .eq("project_id", projectId)
      .eq("id", costId)
      .maybeSingle(),
  );
  return row ? toCost(row) : null;
}

export type Document = {
  id: string;
  projectId: string;
  fileUrl: string;
  status: string;
  confidence: number | null;
  rawExtraction: RawExtraction | null;
};

// The shape of documents.raw_extraction, written by the upload action.
export type RawExtraction = {
  model: string;
  attempts: { attempt: number; stopReason: string | null; text: string; error?: string }[];
  output?: {
    supplier: string;
    date: string;
    line_items: { description: string; qty: number; unit_price_cents: number; total_cents: number }[];
    subtotal_cents: number;
    vat_cents: number;
    total_cents: number;
    category: string;
    confidence: number;
  };
  validation?: { issues: string[]; needsReview: boolean };
  error?: string;
};

export async function listDocuments(projectId: string): Promise<Document[]> {
  const rows = unwrap(
    await getSupabaseAdmin()
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ) ?? [];
  return rows.map(toDocument);
}

export async function getDocument(projectId: string, documentId: string): Promise<Document | null> {
  const row = unwrap(
    await getSupabaseAdmin()
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("id", documentId)
      .maybeSingle(),
  );
  return row ? toDocument(row) : null;
}

export async function getDocumentById(documentId: string): Promise<Document | null> {
  const row = unwrap(
    await getSupabaseAdmin().from("documents").select("*").eq("id", documentId).maybeSingle(),
  );
  return row ? toDocument(row) : null;
}

// Supabase returns an error object instead of throwing, so turn it into an exception.
function unwrap<T>({ data, error }: { data: T | null; error: PostgrestError | null }): T | null {
  if (error) throw new Error(error.message, { cause: error });
  return data;
}

type ProjectFields = Pick<ProjectRow, "id" | "name" | "client_name" | "budget_cents" | "status">;

function toProject(row: ProjectFields): Project {
  return {
    id: row.id,
    name: row.name,
    clientName: row.client_name,
    budgetCents: row.budget_cents,
    status: row.status,
  };
}

function toDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    projectId: row.project_id,
    fileUrl: row.file_url,
    status: row.status,
    confidence: row.confidence,
    rawExtraction: row.raw_extraction as RawExtraction | null,
  };
}

function toCost(row: CostRow): Cost {
  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category,
    supplier: row.supplier,
    description: row.description,
    amountCents: row.amount_cents,
    vatCents: row.vat_cents,
    costDate: row.cost_date,
    source: row.source,
    status: row.status,
  };
}
