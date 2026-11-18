-- Signed-in users reach the data through RLS. The `using` clause filters the rows a user can see
-- or change. The `with check` clause stops a user from writing a row that belongs to another
-- tenant, including by moving one of their own rows into a tenant they are not in.
-- Anonymous visitors still have no grants at all.

grant select on tenants to authenticated;
grant select on memberships to authenticated;
grant select, insert, update, delete on projects, documents, costs, invoices to authenticated;

create policy tenants_member_select on tenants
  for select to authenticated
  using (is_tenant_member(id));

create policy memberships_own_select on memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy projects_tenant_members on projects
  for all to authenticated
  using (is_tenant_member(tenant_id))
  with check (is_tenant_member(tenant_id));

create policy documents_tenant_members on documents
  for all to authenticated
  using (is_tenant_member(tenant_id))
  with check (is_tenant_member(tenant_id));

create policy costs_tenant_members on costs
  for all to authenticated
  using (is_tenant_member(tenant_id))
  with check (is_tenant_member(tenant_id));

create policy invoices_tenant_members on invoices
  for all to authenticated
  using (is_tenant_member(tenant_id))
  with check (is_tenant_member(tenant_id));
