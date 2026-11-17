import { Shell } from "@/components/shell";
import { requireSession } from "@/lib/data/session";
import { modulesFor } from "@/lib/modules";

// Sistema autenticado: as telas dependem da sessão, então podem esperar o servidor.
export const instant = false;

function initialsOf(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

export default async function SystemLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const modules = modulesFor(session.roles).map(({ id, name, href, icon, tint }) => ({ id, name, href, icon, tint }));

  return <Shell modules={modules} initials={initialsOf(session.name)}>{children}</Shell>;
}
