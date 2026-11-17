import { getProject, listProjects } from "@/lib/queries";
import { responseSchema } from "@/lib/validations";

// GET: info about every project, including what has been spent against budget.
export async function getProjects() {
  const projects = await listProjects();
  return Response.json({ projects });
}

// POST: takes { projectId, message } as JSON and answers with a response record.
export async function postResponse(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid response", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const project = await getProject(parsed.data.projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  return Response.json(
    {
      id: crypto.randomUUID(),
      projectId: project.id,
      projectName: project.name,
      message: parsed.data.message,
      createdAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}


