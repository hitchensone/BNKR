import { notFound } from "next/navigation";
import { z } from "zod";
import { ProjectPortal } from "@/components/go-there/portal";
import { requireSession } from "@/lib/data/session";
import { canCreateAccess, getProject, getProjectDetails, listClientUsers } from "@/lib/data/portal";

export default async function ProjectPortalPage({ params }: PageProps<"/go-there/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const project = await getProject(id);
  if (!project) notFound(); // o RLS esconde projetos de outros clientes

  const isAdmin = session.roles.some((r) => r === "owner" || r === "admin");
  const [details, clientUsers] = await Promise.all([
    getProjectDetails(id),
    isAdmin ? listClientUsers(project.client_id) : Promise.resolve([]),
  ]);

  return (
    <ProjectPortal
      project={project}
      {...details}
      isStaff={session.isStaff}
      isAdmin={isAdmin}
      clientUsers={clientUsers}
      canCreateAccess={canCreateAccess()}
    />
  );
}
