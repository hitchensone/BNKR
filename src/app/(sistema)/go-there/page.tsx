import { redirect } from "next/navigation";
import { ProjectsOverview } from "@/components/go-there/overview";
import { requireSession } from "@/lib/data/session";
import { listClients, listProjects } from "@/lib/data/portal";

export default async function GoTherePage() {
  const session = await requireSession();
  const projects = await listProjects();

  // Cliente com um único projeto vai direto para ele.
  if (!session.isStaff && projects.length === 1) redirect(`/go-there/${projects[0].id}`);

  const clients = session.isStaff ? await listClients() : [];
  return <ProjectsOverview projects={projects} isStaff={session.isStaff} clients={clients} />;
}
