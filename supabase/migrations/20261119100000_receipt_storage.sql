-- Receipt files live in a private bucket. Each object's path is
--   <org_id>/<project_id>/<sha256 of the file>.<extension>
-- The first folder is the organization and the second is a project in it. The policies below
-- check both, so a member can only read, write and delete files under its own organization.
-- The file's hash is its name, so the same file always has the same path, and a repeat upload
-- is rejected by storage rather than stored twice.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The organization that a storage object belongs to, from the first folder. Null when the first
-- folder is not a UUID, so odd paths match no organization instead of raising an error.
create or replace function private.receipt_org_id(p_object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_object_name, '/', 1)::uuid
  end;
$$;

-- An upload is allowed only into a project folder of an organization the caller belongs to, and
-- only when that project really belongs to the organization. The second check stops a member
-- from filing into a project of another organization.
create or replace function private.can_upload_receipt(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.org_id = private.receipt_org_id(p_object_name)
      and p.id::text = split_part(p_object_name, '/', 2)
      and private.is_org_member(p.org_id)
  );
$$;

revoke execute on function private.receipt_org_id(text) from public, anon;
revoke execute on function private.can_upload_receipt(text) from public, anon;
grant execute on function private.receipt_org_id(text) to authenticated;
grant execute on function private.can_upload_receipt(text) to authenticated;

create policy receipts_members_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and private.is_org_member(private.receipt_org_id(name))
  );

create policy receipts_members_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and private.can_upload_receipt(name)
  );

create policy receipts_owners_admins_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and private.has_org_role(private.receipt_org_id(name), array['owner', 'admin'])
  );

-- No update policy. A stored receipt is never overwritten.
