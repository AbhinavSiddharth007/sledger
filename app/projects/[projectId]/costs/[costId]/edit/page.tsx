import Link from "next/link";
import { notFound } from "next/navigation";
import { CostForm } from "@/components/cost-form";
import { getCost, getProject } from "@/lib/queries";
import { uuidSchema } from "@/lib/validations";
import { updateCost } from "../../actions";

export default async function EditCostPage({
  params,
}: {
  params: Promise<{ projectId: string; costId: string }>;
}) {
  const { projectId, costId } = await params;
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(costId).success) {
    notFound();
  }

  const project = await getProject(projectId);
  const cost = project ? await getCost(projectId, costId) : null;
  if (!project || !cost) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:underline">
        ← {project.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Edit cost</h1>

      <CostForm
        action={updateCost.bind(null, projectId, costId)}
        projectId={projectId}
        defaults={{
          category: cost.category,
          supplier: cost.supplier,
          description: cost.description,
          amount: (cost.amountCents / 100).toFixed(2),
          vat: (cost.vatCents / 100).toFixed(2),
          costDate: cost.costDate,
          status: cost.status,
        }}
      />
    </main>
  );
}
