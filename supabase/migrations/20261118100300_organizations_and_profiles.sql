-- The tenant model becomes organizations. tenants is renamed to organizations, memberships to
-- org_members, and every tenant_id to org_id. Membership roles are owner, admin and member.
-- Each user also gets a profile row, created by a trigger on auth.users.

-- Tables and columns ------------------------------------------------------------------------

alter table tenants rename to organizations;
alter table memberships rename to org_members;
alter table org_members rename column tenant_id to org_id;
alter index memberships_user_id_idx rename to org_members_user_id_idx;

alter table org_members drop constraint memberships_role_check;
alter table org_members add constraint org_members_role_check
  check (role in ('owner', 'admin', 'member'));

alter table projects rename column tenant_id to org_id;
alter table documents rename column tenant_id to org_id;
alter table costs rename column tenant_id to org_id;
alter table invoices rename column tenant_id to org_id;

alter index projects_tenant_id_idx rename to projects_org_id_idx;
alter index documents_tenant_id_idx rename to documents_org_id_idx;
alter index costs_tenant_id_idx rename to costs_org_id_idx;
alter index invoices_tenant_id_idx rename to invoices_org_id_idx;

-- Supabase grants every privilege on a new table by default. Only the read paths and the
-- policies below may reach these tables, so the default grants are taken back.
revoke all on organizations, org_members from anon, authenticated;
grant select on organizations, org_members to authenticated;

-- Drop everything that refers to the old names, then rebuild it -------------------------------

drop policy tenants_member_select on organizations;
drop policy memberships_own_select on org_members;
drop policy projects_tenant_members on projects;
drop policy documents_tenant_members on documents;
drop policy costs_tenant_members on costs;
drop policy invoices_tenant_members on invoices;

drop trigger documents_inherit_tenant on documents;
drop trigger costs_inherit_tenant on costs;
drop trigger invoices_inherit_tenant on invoices;
drop function inherit_project_tenant();

drop trigger on_auth_user_created on auth.users;
drop function handle_new_user();
drop function is_tenant_member(uuid);

-- Membership check ------------------------------------------------------------------------

-- True when the signed-in user is a member of the organization, whatever the role.
create or replace function is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = (select auth.uid())
  );
$$;

revoke execute on function is_org_member(uuid) from public, anon;
grant execute on function is_org_member(uuid) to authenticated;

-- Row level security -----------------------------------------------------------------------

create policy organizations_member_select on organizations
  for select to authenticated
  using (is_org_member(id));

create policy org_members_own_select on org_members
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy projects_org_members on projects
  for all to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

create policy documents_org_members on documents
  for all to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

create policy costs_org_members on costs
  for all to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

create policy invoices_org_members on invoices
  for all to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- Sign-up triggers ------------------------------------------------------------------------

-- Every new user starts its own organization, with the user as owner.
create or replace function handle_new_user_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into organizations (name)
  values ('Workspace for ' || coalesce(new.email, new.id::text))
  returning id into v_org_id;

  insert into org_members (org_id, user_id, role)
  values (v_org_id, new.id, 'owner');

  return new;
end;
$$;

revoke execute on function handle_new_user_organization() from public, anon, authenticated;

create trigger on_auth_user_created_organization
  after insert on auth.users
  for each row execute function handle_new_user_organization();

-- Profiles -------------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Supabase grants every privilege on a new table by default, so take them back first. Users read
-- their own profile, and may change only their name. Email comes from Auth.
revoke all on profiles from anon, authenticated;
grant select on profiles to authenticated;
grant update (full_name) on profiles to authenticated;

create policy profiles_own_select on profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_own_update on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

revoke execute on function handle_new_user_profile() from public, anon, authenticated;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function handle_new_user_profile();

-- Users created before this migration get a profile too.
insert into profiles (id, email, full_name)
select id, email, raw_user_meta_data ->> 'full_name' from auth.users
on conflict (id) do nothing;

-- Organization ownership triggers ----------------------------------------------------------

-- Documents, costs and invoices take their org from their project, as before.
create or replace function inherit_project_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select p.org_id into new.org_id from projects p where p.id = new.project_id;
  return new;
end;
$$;

revoke execute on function inherit_project_org() from public, anon, authenticated;

create trigger documents_inherit_org before insert or update of project_id on documents
  for each row execute function inherit_project_org();
create trigger costs_inherit_org before insert or update of project_id on costs
  for each row execute function inherit_project_org();
create trigger invoices_inherit_org before insert or update of project_id on invoices
  for each row execute function inherit_project_org();
