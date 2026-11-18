-- Membership checks move to a private schema. The Data API exposes only public and graphql_public
-- (see supabase/config.toml), so these helpers can be called from policies but not over HTTP.
--
-- Access rules, per organization:
--   read           any member
--   insert, update any member
--   delete         owner and admin only

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- True when the signed-in user is a member of the organization, whatever the role. Security
-- definer, so that it reads org_members without the policies on org_members applying to it.
create or replace function private.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = (select auth.uid())
  );
$$;

-- True when the signed-in user holds one of the given roles in the organization.
create or replace function private.has_org_role(p_org_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id
      and user_id = (select auth.uid())
      and role = any (p_roles)
  );
$$;

revoke execute on function private.is_org_member(uuid) from public, anon;
revoke execute on function private.has_org_role(uuid, text[]) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;

-- Replace the policies that used the public helper ------------------------------------------

drop policy organizations_member_select on public.organizations;
drop policy org_members_own_select on public.org_members;
drop policy projects_org_members on public.projects;
drop policy documents_org_members on public.documents;
drop policy costs_org_members on public.costs;
drop policy invoices_org_members on public.invoices;

drop function public.is_org_member(uuid);

-- Organizations and their members are visible to members of the organization.
create policy organizations_member_select on public.organizations
  for select to authenticated
  using (private.is_org_member(id));

create policy org_members_member_select on public.org_members
  for select to authenticated
  using (private.is_org_member(org_id));

-- Organization data: members read, insert and update. Only owners and admins delete.
create policy projects_select on public.projects
  for select to authenticated
  using (private.is_org_member(org_id));
create policy projects_insert on public.projects
  for insert to authenticated
  with check (private.is_org_member(org_id));
create policy projects_update on public.projects
  for update to authenticated
  using (private.is_org_member(org_id))
  with check (private.is_org_member(org_id));
create policy projects_delete on public.projects
  for delete to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']));

create policy documents_select on public.documents
  for select to authenticated
  using (private.is_org_member(org_id));
create policy documents_insert on public.documents
  for insert to authenticated
  with check (private.is_org_member(org_id));
create policy documents_update on public.documents
  for update to authenticated
  using (private.is_org_member(org_id))
  with check (private.is_org_member(org_id));
create policy documents_delete on public.documents
  for delete to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']));

create policy costs_select on public.costs
  for select to authenticated
  using (private.is_org_member(org_id));
create policy costs_insert on public.costs
  for insert to authenticated
  with check (private.is_org_member(org_id));
create policy costs_update on public.costs
  for update to authenticated
  using (private.is_org_member(org_id))
  with check (private.is_org_member(org_id));
create policy costs_delete on public.costs
  for delete to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']));

create policy invoices_select on public.invoices
  for select to authenticated
  using (private.is_org_member(org_id));
create policy invoices_insert on public.invoices
  for insert to authenticated
  with check (private.is_org_member(org_id));
create policy invoices_update on public.invoices
  for update to authenticated
  using (private.is_org_member(org_id))
  with check (private.is_org_member(org_id));
create policy invoices_delete on public.invoices
  for delete to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']));
