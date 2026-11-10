-- Sledger schema. Requires PostgreSQL 13+ (gen_random_uuid is built in).
-- All money is integer cents in EUR. Never store floats for money.
-- Every table has created_at. Statements are idempotent so the seed can re-run them.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text not null,
  budget_cents bigint not null check (budget_cents >= 0),
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists projects_status_idx on projects (status);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id),
  file_url text not null,
  raw_extraction jsonb,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  status text not null default 'pending'
    check (status in ('pending', 'extracted', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists documents_project_id_idx on documents (project_id);
create index if not exists documents_status_idx on documents (status);

create table if not exists costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id),
  category text not null
    check (category in ('materials', 'labour', 'subcontractor', 'other')),
  supplier text not null,
  description text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  vat_cents bigint not null default 0 check (vat_cents >= 0),
  cost_date date not null,
  source text not null check (source in ('manual', 'ai_extracted')),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'needs_review')),
  created_at timestamptz not null default now()
);

create index if not exists costs_project_id_idx on costs (project_id);
create index if not exists costs_status_idx on costs (status);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id),
  number text not null unique,
  amount_cents bigint not null check (amount_cents >= 0),
  issued_at date not null,
  due_at date not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  check (due_at >= issued_at)
);

create index if not exists invoices_project_id_idx on invoices (project_id);
create index if not exists invoices_status_idx on invoices (status);
