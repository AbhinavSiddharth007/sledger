-- Writes the result of an extraction in one statement. The model call happens outside the
-- database, so it cannot share a transaction with this write. One UPDATE is still all or
-- nothing, and the status guard means a late result never overwrites a document that was
-- already confirmed or rejected. Returns false when nothing was written.
--
-- A null p_confidence or p_status keeps the stored value. A failed extraction passes nulls, so
-- the document stays pending with its error recorded in raw_extraction.

create or replace function record_extraction(
  p_project_id uuid,
  p_document_id uuid,
  p_raw_extraction jsonb,
  p_confidence numeric default null,
  p_status text default null
)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update documents
  set raw_extraction = p_raw_extraction,
      confidence = coalesce(p_confidence, confidence),
      status = coalesce(p_status, status)
  where id = p_document_id
    and project_id = p_project_id
    and status = 'pending';

  return found;
end;
$$;

revoke execute on function record_extraction(uuid, uuid, jsonb, numeric, text)
  from public, anon, authenticated;
grant execute on function record_extraction(uuid, uuid, jsonb, numeric, text) to service_role;
