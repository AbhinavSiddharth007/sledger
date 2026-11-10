import Link from "next/link";
import { notFound } from "next/navigation";
import { CostsTable } from "@/components/costs-table";
import { StatusBadge } from "@/components/status-badge";
import { formatCents } from "@/lib/format";
import { getProject, listCosts } from "@/lib/queries";
import { uuidSchema } from "@/lib/validations";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!uuidSchema.safeParse(projectId).success) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  const costs = await listCosts(projectId);
  const spentCents = costs.reduce((sum, cost) => sum + cost.amountCents, 0);
  const vatCents = costs.reduce((sum, cost) => sum + cost.vatCents, 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link href="/projects" className="text-sm text-zinc-500 hover:underline">
        ← Projects
      </Link>

      <header className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-zinc-500">{project.clientName}</p>
        </div>
        <StatusBadge status={project.status} />
      </header>

      <dl className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Budget" value={formatCents(project.budgetCents)} />
        <Stat label="Spent (net)" value={formatCents(spentCents)} />
        <Stat label="Remaining" value={formatCents(project.budgetCents - spentCents)} />
        <Stat label="VAT" value={formatCents(vatCents)} />
      </dl>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Costs</h2>
        <Link
          href={`/projects/${projectId}/costs/new`}
          className="rounded bg-black px-3 py-1.5 text-sm text-white"
        >
          Add cost
        </Link>
      </div>

      <CostsTable projectId={projectId} costs={costs} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-200 p-4">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-lg font-semibold whitespace-nowrap">{value}</dd>
    </div>
  );
}
