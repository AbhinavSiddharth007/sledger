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
    <header className="flex items-center justify-between border-b px-6 py-3 text-sm">
      <Link href="/projects" className="font-semibold">
        Sledger
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-zinc-600">{data?.claims.email}</span>
        <form action={signOut}>
          <button type="submit" className="rounded border px-3 py-1">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
