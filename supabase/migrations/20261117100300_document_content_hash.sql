-- A file uploaded twice to the same project is one document. The hash is SHA-256 of the file
-- bytes, written as lowercase hex. Documents from before this migration have no hash and are
-- not affected by the unique index.

alter table documents
  add column content_hash text check (content_hash ~ '^[0-9a-f]{64}$');

create unique index documents_project_content_hash_key
  on documents (project_id, content_hash)
  where content_hash is not null;

-- Creates the document, or returns the existing one with the same hash. The insert and the
-- lookup happen in one statement, so two simultaneous uploads of the same file cannot both win.
-- `created` tells the caller whether it must keep the file it just saved.
create or replace function start_document(
  p_project_id uuid,
  p_file_url text,
  p_content_hash text
)
returns table (document_id uuid, created boolean)
language plpgsql
set search_path = public
as $$
begin
  return query
  with inserted as (
    insert into documents (project_id, file_url, status, content_hash)
    values (p_project_id, p_file_url, 'pending', p_content_hash)
    on conflict (project_id, content_hash) where content_hash is not null do nothing
    returning id
  )
  select inserted.id, true from inserted
  union all
  select d.id, false
  from documents d
  where d.project_id = p_project_id
    and d.content_hash = p_content_hash
    and not exists (select 1 from inserted);
end;
$$;

revoke execute on function start_document(uuid, text, text) from public, anon, authenticated;
grant execute on function start_document(uuid, text, text) to service_role;
