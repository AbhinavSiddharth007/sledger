-- Invoicing. An invoice goes draft -> sent -> paid. A sent invoice whose due date has passed
-- becomes overdue, and an overdue invoice can still be paid.
--
-- Numbers: INV-<year>-<4-digit sequence>, with one sequence per organization and year. Two
-- creates at the same time cannot get the same number. create_invoice takes the next value with
-- INSERT ... ON CONFLICT DO UPDATE on the counter row. The row lock makes the second caller wait
-- for the first to commit, and then it reads the value the first one wrote. The counter bump and
-- the invoice insert are one transaction, so an insert that fails also gives its number back,
-- which leaves no gap. The unique (org_id, number) constraint is a backstop behind this.

create extension if not exists pg_cron with schema pg_catalog;

alter table invoices add column paid_at date;

alter table invoices drop constraint invoices_number_key;
alter table invoices add constraint invoices_org_number_key unique (org_id, number);

create index invoices_org_paid_at_idx on invoices (org_id, paid_at) where status = 'paid';

create table invoice_counters (
  org_id uuid not null references organizations (id) on delete cascade,
  year int not null check (year between 2000 and 9999),
  last_number int not null default 0 check (last_number >= 0),
  primary key (org_id, year)
);

-- Only the functions below touch this table, so signed-in users get no grants and no policies.
alter table invoice_counters enable row level security;
revoke all on invoice_counters from anon, authenticated;

-- Creates a draft invoice in a project the caller belongs to. Security definer, so it can use the
-- counter table. The membership check is done here, in place of RLS. A project the caller cannot
-- see gets the same error as one that does not exist, so it reveals nothing.
create or replace function create_invoice(
  p_project_id uuid,
  p_amount_cents bigint,
  p_issued_at date,
  p_due_at date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_year int := extract(year from p_issued_at)::int;
  v_number int;
  v_invoice_id uuid;
begin
  select p.org_id into v_org_id from public.projects p where p.id = p_project_id;
  if v_org_id is null or not private.is_org_member(v_org_id) then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  insert into public.invoice_counters as c (org_id, year, last_number)
  values (v_org_id, v_year, 1)
  on conflict (org_id, year) do update set last_number = c.last_number + 1
  returning last_number into v_number;

  insert into public.invoices (project_id, org_id, number, amount_cents, issued_at, due_at, status)
  values (
    p_project_id,
    v_org_id,
    'INV-' || v_year || '-' || lpad(v_number::text, 4, '0'),
    p_amount_cents,
    p_issued_at,
    p_due_at,
    'draft'
  )
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

revoke execute on function create_invoice(uuid, bigint, date, date) from public, anon;
grant execute on function create_invoice(uuid, bigint, date, date) to authenticated;

-- The status rules and the edit rules are enforced in the database, so no client can skip them.
create or replace function enforce_invoice_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'A new invoice starts as a draft';
    end if;
    return new;
  end if;

  if new.number is distinct from old.number then
    raise exception 'An invoice number cannot change';
  end if;

  if old.status <> 'draft'
     and (new.amount_cents, new.issued_at, new.due_at)
         is distinct from (old.amount_cents, old.issued_at, old.due_at) then
    raise exception 'Only a draft invoice can be edited';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'sent')
      or (old.status = 'sent' and new.status = 'paid')
      or (old.status = 'sent' and new.status = 'overdue' and old.due_at < current_date)
      or (old.status = 'overdue' and new.status = 'paid')
    ) then
      raise exception 'An invoice cannot go from % to %', old.status, new.status;
    end if;

    if new.status = 'paid' then
      new.paid_at := coalesce(new.paid_at, current_date);
    end if;
  end if;

  return new;
end;
$$;

create trigger invoices_enforce_rules
  before insert or update on invoices
  for each row execute function enforce_invoice_rules();

-- Marks every sent invoice whose due date has passed as overdue. pg_cron runs it below.
create or replace function mark_overdue_invoices()
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.invoices
    set status = 'overdue'
    where status = 'sent' and due_at < current_date
    returning 1
  )
  select count(*)::int from updated;
$$;

revoke all on function mark_overdue_invoices() from public, anon, authenticated;
-- The server, through the secret key, may run it too. Tests use this to check the rule directly.
grant execute on function mark_overdue_invoices() to service_role;

select cron.schedule('mark-overdue-invoices', '*/15 * * * *', $$select public.mark_overdue_invoices()$$);
