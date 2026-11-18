-- The receipt functions run as the caller (security invoker, the default), so their reads and
-- writes go through RLS. A signed-in member can therefore use them on their own tenant's
-- documents, and a user from another tenant gets no rows back. Anonymous visitors still cannot
-- execute them.

grant execute on function confirm_receipt(uuid, uuid, text, text, text, bigint, bigint, date, text)
  to authenticated;
grant execute on function start_document(uuid, text, text) to authenticated;
grant execute on function record_extraction(uuid, uuid, jsonb, numeric, text) to authenticated;
