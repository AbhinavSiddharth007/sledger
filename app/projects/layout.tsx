import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<header className="border-b px-6 py-3 text-sm" />}>
        <SiteHeader />
      </Suspense>
      {children}
    </>
  );
}

async function SiteHeader() {
  // The session check reads the clock, so this must render per request.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3 text-sm sm:px-6">
      <div className="flex items-center gap-6">
        <Link href="/projects" className="font-semibold">
          Sledger
        </Link>
        <Link href="/projects/cash-flow" className="text-zinc-700 underline-offset-2 hover:underline">
          Cash flow
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="min-w-0 truncate text-zinc-600">{data?.claims.email}</span>
        <form action={signOut}>
          <button type="submit" className="rounded border px-3 py-1">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
