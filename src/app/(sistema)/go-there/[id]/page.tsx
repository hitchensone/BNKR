import { notFound } from "next/navigation";
import { z } from "zod";
import { ProjectPortal } from "@/components/go-there/portal";
import { requireSession, todaySP } from "@/lib/data/session";
import { listPosts } from "@/lib/data/posts";
import { canCreateAccess, getProject, getProjectDetails, listClientUsers } from "@/lib/data/portal";

export default async function ProjectPortalPage({ params }: PageProps<"/go-there/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const project = await getProject(id);
  if (!project) notFound(); // o RLS esconde projetos de outros clientes

  const isAdmin = session.roles.some((r) => r === "owner" || r === "admin");
  const [details, clientUsers, posts, today] = await Promise.all([
    getProjectDetails(id),
    isAdmin ? listClientUsers(project.client_id) : Promise.resolve([]),
    listPosts({ projectId: id }).then((scheduled) => listPosts({ projectId: id, unscheduled: true }).then((u) => [...scheduled, ...u])),
    todaySP(),
  ]);

  return (
    <ProjectPortal
      project={project}
      {...details}
      isStaff={session.isStaff}
      isAdmin={isAdmin}
      clientUsers={clientUsers}
      canCreateAccess={canCreateAccess()}
      posts={posts}
      today={today}
    />
  );
}
