-- Confirms a reviewed receipt as a cost. The document is claimed and the cost is inserted in
-- one call, so a failed insert also rolls back the claim. Returns null when the document is
-- not pending or extracted, which means it was already confirmed or rejected. In that case
-- nothing is inserted, so a double submit cannot create a duplicate cost.

create or replace function confirm_receipt(
  p_project_id uuid,
  p_document_id uuid,
  p_category text,
  p_supplier text,
  p_description text,
  p_amount_cents bigint,
  p_vat_cents bigint,
  p_cost_date date,
  p_status text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_cost_id uuid;
begin
  update documents
  set status = 'confirmed'
  where id = p_document_id
    and project_id = p_project_id
    and status in ('pending', 'extracted');

  if not found then
    return null;
  end if;

  insert into costs
    (project_id, category, supplier, description, amount_cents, vat_cents,
     cost_date, source, status)
  values
    (p_project_id, p_category, p_supplier, p_description, p_amount_cents, p_vat_cents,
     p_cost_date, 'ai_extracted', p_status)
  returning id into v_cost_id;

  return v_cost_id;
end;
$$;

-- Only the server may call this. Without the revoke, PostgREST would expose it to anon.
revoke execute on function confirm_receipt(uuid, uuid, text, text, text, bigint, bigint, date, text)
  from public, anon, authenticated;
grant execute on function confirm_receipt(uuid, uuid, text, text, text, bigint, bigint, date, text)
  to service_role;
