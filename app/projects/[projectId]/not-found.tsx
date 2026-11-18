import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Project not found</h1>
      <p className="text-zinc-600">This project does not exist, or it belongs to another organization.</p>
      <Link href="/projects" className="w-fit rounded border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        All projects
      </Link>
    </main>
  );
}
