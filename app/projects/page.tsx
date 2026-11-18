import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatCents } from "@/lib/format";
import { listProjects } from "@/lib/queries";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>

      {projects.length === 0 ? (
        <p className="text-zinc-600">No projects yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">All projects in your organization</caption>
            <thead className="border-b text-zinc-600">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Project</th>
                <th scope="col" className="hidden py-2 pr-4 font-medium sm:table-cell">Client</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Budget</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Spent (net)</th>
                <th scope="col" className="hidden py-2 pr-4 font-medium md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-blue-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      {project.name}
                    </Link>
                    <span className="block text-zinc-600 sm:hidden">{project.clientName}</span>
                  </td>
                  <td className="hidden py-2 pr-4 sm:table-cell">{project.clientName}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(project.budgetCents)}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(project.spentCents)}</td>
                  <td className="hidden py-2 pr-4 md:table-cell">
                    <StatusBadge status={project.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
