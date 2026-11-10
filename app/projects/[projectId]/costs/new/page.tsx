import Link from "next/link";
import { notFound } from "next/navigation";
import { CostForm } from "@/components/cost-form";
import { getProject } from "@/lib/queries";
import { uuidSchema } from "@/lib/validations";
import { createCost } from "../actions";

export default async function NewCostPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!uuidSchema.safeParse(projectId).success) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:underline">
        ← {project.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Add cost</h1>

      <CostForm action={createCost.bind(null, projectId)} projectId={projectId} />
    </main>
  );
}
