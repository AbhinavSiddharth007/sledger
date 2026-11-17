-- The app reads and writes only from the server, with the secret key. That key bypasses
-- row level security. Enabling RLS with no policies means the publishable key and
-- signed-in users see nothing, even though Supabase exposes new public tables by default.

alter table projects enable row level security;
alter table documents enable row level security;
alter table costs enable row level security;
alter table invoices enable row level security;

revoke all on projects, documents, costs, invoices from anon, authenticated;
