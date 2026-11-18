import { Shell } from "@/components/shell";
import { requireSession } from "@/lib/data/session";
import { modulesFor } from "@/lib/modules";

// Sistema autenticado: as telas dependem da sessão, então podem esperar o servidor.
export const instant = false;

export default async function SystemLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const modules = modulesFor(session.roles).map(({ id, name, href, icon, tint }) => ({ id, name, href, icon, tint }));

  return <Shell modules={modules} theme={session.theme}>{children}</Shell>;
}
