import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <>
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
      {children}
    </>
  );
}
