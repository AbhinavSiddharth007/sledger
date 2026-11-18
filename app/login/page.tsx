import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMagicLink, signInWithPassword, signUpWithPassword } from "./actions";

const INPUT =
  "w-full rounded border border-zinc-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 aria-[invalid=true]:border-red-600";
const BUTTON =
  "rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  // The session check reads the clock, so this must render per request.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data) redirect("/projects");

  const { error, sent } = await searchParams;

  return (
    <main id="main" className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Sign in to Sledger</h1>
        <p className="text-zinc-600">Track what your projects cost.</p>
      </header>

      {error ? (
        <p role="alert" className="rounded bg-red-100 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {sent ? (
        <p role="status" className="rounded bg-green-100 px-3 py-2 text-sm text-green-900">
          Check your email for a sign-in link.
        </p>
      ) : null}

      <form action={signInWithPassword} className="grid gap-4">
        <h2 className="font-medium">Email and password</h2>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email" className={INPUT} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Password</span>
          <input name="password" type="password" required minLength={6} autoComplete="current-password" className={INPUT} />
        </label>
        <button type="submit" className={`${BUTTON} bg-zinc-900 text-white`}>
          Sign in
        </button>
        <button formAction={signUpWithPassword} className={`${BUTTON} border`}>
          Create an account
        </button>
      </form>

      <form action={sendMagicLink} className="grid gap-4">
        <h2 className="font-medium">Or get a sign-in link by email</h2>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email" className={INPUT} />
        </label>
        <button type="submit" className={`${BUTTON} border`}>
          Email me a link
        </button>
      </form>
    </main>
  );
}
