-- Multi-tenancy. A tenant is a workspace. Every data row belongs to exactly one tenant, and
-- row level security (next migration) only lets members of a tenant see its rows.

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table memberships (
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index memberships_user_id_idx on memberships (user_id);

alter table tenants enable row level security;
alter table memberships enable row level security;

-- True when the signed-in user belongs to the tenant. It is security definer so that the
-- policies on other tables do not depend on the policies of memberships.
create or replace function is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where tenant_id = p_tenant_id and user_id = (select auth.uid())
  );
$$;

revoke execute on function is_tenant_member(uuid) from public, anon;
grant execute on function is_tenant_member(uuid) to authenticated;

-- Every new sign-up gets a workspace of its own, with the user as owner. Invitations to join
-- someone else's workspace are not part of this migration.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  insert into tenants (name)
  values ('Workspace for ' || coalesce(new.email, new.id::text))
  returning id into v_tenant_id;

  insert into memberships (tenant_id, user_id, role)
  values (v_tenant_id, new.id, 'owner');

  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Every project belongs to a tenant. Documents, costs and invoices take their tenant from their
-- project, so they cannot disagree with it.
alter table projects add column tenant_id uuid references tenants (id);
alter table documents add column tenant_id uuid references tenants (id);
alter table costs add column tenant_id uuid references tenants (id);
alter table invoices add column tenant_id uuid references tenants (id);

create or replace function inherit_project_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select p.tenant_id into new.tenant_id from projects p where p.id = new.project_id;
  return new;
end;
$$;

revoke execute on function inherit_project_tenant() from public, anon, authenticated;

create trigger documents_inherit_tenant before insert or update of project_id on documents
  for each row execute function inherit_project_tenant();
create trigger costs_inherit_tenant before insert or update of project_id on costs
  for each row execute function inherit_project_tenant();
create trigger invoices_inherit_tenant before insert or update of project_id on invoices
  for each row execute function inherit_project_tenant();

-- The tables are empty when this runs, because it runs on `supabase db reset`. A deployed
-- database with rows would need a backfill before these become NOT NULL.
alter table projects alter column tenant_id set not null;
alter table documents alter column tenant_id set not null;
alter table costs alter column tenant_id set not null;
alter table invoices alter column tenant_id set not null;

create index projects_tenant_id_idx on projects (tenant_id);
create index documents_tenant_id_idx on documents (tenant_id);
create index costs_tenant_id_idx on costs (tenant_id);
create index invoices_tenant_id_idx on invoices (tenant_id);
