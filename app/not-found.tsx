import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-zinc-600">The page you asked for does not exist, or you do not have access to it.</p>
      <Link href="/projects" className="w-fit rounded border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        Back to projects
      </Link>
    </main>
  );
}
