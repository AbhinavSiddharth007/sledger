import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatCents } from "@/lib/format";
import { listProjects } from "@/lib/queries";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>

      {projects.length === 0 ? (
        <p className="text-zinc-500">No projects yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b text-zinc-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Project</th>
              <th className="py-2 pr-4 font-medium">Client</th>
              <th className="py-2 pr-4 text-right font-medium">Budget</th>
              <th className="py-2 pr-4 text-right font-medium">Spent (net)</th>
              <th className="py-2 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b">
                <td className="py-2 pr-4">
                  <Link href={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                    {project.name}
                  </Link>
                </td>
                <td className="py-2 pr-4">{project.clientName}</td>
                <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(project.budgetCents)}</td>
                <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(project.spentCents)}</td>
                <td className="py-2 pr-4">
                  <StatusBadge status={project.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
