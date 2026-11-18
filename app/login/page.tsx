import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMagicLink, signInWithPassword, signUpWithPassword } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data) redirect("/projects");

  const { error, sent } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Sign in to Sledger</h1>
        <p className="text-sm text-zinc-600">Track what your projects cost.</p>
      </header>

      {error ? (
        <p role="alert" className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {sent ? (
        <p className="rounded bg-green-100 px-3 py-2 text-sm text-green-800">
          Check your email for a sign-in link.
        </p>
      ) : null}

      <form action={signInWithPassword} className="flex flex-col gap-3">
        <h2 className="font-medium">Email and password</h2>
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className="rounded border px-3 py-2" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className="rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-white">
          Sign in
        </button>
        <button formAction={signUpWithPassword} className="rounded border px-3 py-2">
          Create an account
        </button>
      </form>

      <form action={sendMagicLink} className="flex flex-col gap-3">
        <h2 className="font-medium">Or get a sign-in link by email</h2>
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className="rounded border px-3 py-2" />
        <button type="submit" className="rounded border px-3 py-2">
          Email me a link
        </button>
      </form>
    </main>
  );
}
