# Sledger

Sledger tracks what a construction project costs. Each project has a budget, and every
supplier invoice, labour charge and subcontractor bill is recorded against it in euros. Receipts
and delivery notes can be uploaded as a photo or PDF. Claude reads them, and a person reviews the
result before it becomes a cost.

Projects sit in Spain (VAT 21%) and Italy (VAT 22%). Money is stored as integer cents.

## Setup

You need Node.js 22 or newer, and Docker. Docker runs the local Supabase stack.

```bash
npm install
cp .env.example .env.local      # then set ANTHROPIC_API_KEY
npm run db:start                # starts Postgres, Auth and the API in Docker
npm run db:reset                # applies migrations and loads supabase/seed.sql
npm run db:env                  # writes .env.test.local from the running stack
```

`npm run db:start` prints the local URL and keys. Copy the publishable key and the secret key
into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY from npm run db:start>
SUPABASE_SECRET_KEY=<SECRET_KEY from npm run db:start>
ANTHROPIC_API_KEY=<your key>
```

Then start the app:

```bash
npm run dev                     # http://localhost:3000
```

Studio, the local Supabase dashboard, is at http://127.0.0.1:54323.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript with `--noEmit` |
| `npm test` | Unit and integration tests. The integration tests need the local stack running. |
| `npm run db:start` / `db:stop` | Start or stop the local Supabase stack |
| `npm run db:reset` | Rebuild the local database from `supabase/migrations`, then load the seed |
| `npm run db:env` | Write `.env.test.local` from the running stack |
| `npm run db:types` | Regenerate `lib/database.types.ts` after a schema change |

## Architecture

```
app/                 Next.js routes, server components and server actions
  projects/          project list, project detail, cost forms, receipt review
  api/               REST routes: GET /api/projects, POST /api/responses, GET /api/documents/:id
api/api.ts           handlers behind the REST routes
components/          UI pieces
lib/
  queries.ts         reads. Server-only.
  supabase/
    admin.ts         server-only client with the secret key. Used by queries and actions.
    server.ts        @supabase/ssr client that reads and writes cookies, for user-scoped code
    browser.ts       @supabase/ssr client for client components
    config.ts        reads the public URL and publishable key
  receipts/          Claude extraction and the receipt arithmetic checks
  storage.ts         receipt files, kept on local disk under uploads/
  database.types.ts  generated from the schema with `npm run db:types`
supabase/
  config.toml        local stack settings
  migrations/        schema, access lockdown, confirm_receipt function
  seed.sql           sample projects and costs for development
tests/
  unit/              pure functions, no database
  integration/       queries, constraints and functions against the local stack
```

### Data flow

Pages and server actions run on the server. They use the admin client, which holds the secret key
and bypasses row level security. The browser never talks to the database directly. Every table
has RLS on and no policies, and `anon` and `authenticated` have no table grants. So the publishable
key, which ships to the browser, cannot read or write anything.

Confirming a receipt is the one operation that must be all-or-nothing. It calls the
`confirm_receipt` function, which claims the document and inserts the cost in one transaction.
A document can be confirmed only once: a second call returns `null` and inserts nothing, so a
double submit cannot create a duplicate cost. The function is executable only by `service_role`.

Receipts are uploaded through a server action. The upload is hashed with SHA-256, and
`start_document` creates the document or returns the existing one for the same hash in that
project. A duplicate upload is therefore not extracted again: the server deletes the copy it just
saved and redirects to the original. Only a new file goes to Claude. Its JSON result is written by
`record_extraction` in one statement, which only touches a document that is still pending. Claude's
arithmetic is then checked in code (line items against subtotal, subtotal plus VAT against total),
and anything that fails is marked for review.

A model call cannot run inside a database transaction, so the extraction write is atomic as a
single statement rather than as a multi-step transaction.

### Database

- Migrations live in `supabase/migrations` and run in order. Never edit one that has been
  committed. Add a new migration instead.
- `supabase/seed.sql` runs on `npm run db:reset` only. It is for development and must not run
  against production.
- Money is `bigint` cents with CHECK constraints on every amount. Floats never store money.

## Why Supabase

- **A real Postgres with a migration history.** The schema is plain SQL in version control, and
  the same migrations run locally, in CI and in production. The local stack is the production
  database engine, so there is no SQLite-versus-Postgres drift.
- **Keys split by audience.** The publishable key is safe in the browser. The secret key stays on
  the server. Locking the Data API down (RLS and revoked grants) means a leaked publishable key
  exposes nothing.
- **Room to grow.** Supabase Auth and per-user RLS can be added later without moving the data
  or changing the database engine.
- **Typed access.** `supabase gen types` generates the table types the queries use, so a column
  rename fails the build rather than failing in production.
- **Functions where we need them.** Multi-step writes such as receipt confirmation live in the
  database as one transaction, not split across round trips from the app.

Trade-offs: local development needs Docker, and the stack takes a minute to start. Receipt files
still live on local disk under `uploads/`. Moving them to Supabase Storage is a separate step.

## Deploying

Set the three Supabase variables and `ANTHROPIC_API_KEY` in the host. Then link the CLI to the
hosted project once with `npx supabase link`, and apply the migrations with `npx supabase db push`.
Do not run the seed there.
