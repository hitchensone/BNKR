import { HomeGrid } from "@/components/home-grid";
import { Tile, Widget } from "@/components/ui";
import { requireSession } from "@/lib/data/session";
import { modulesFor } from "@/lib/modules";

export default async function Desktop() {
  const session = await requireSession();

  if (session.roles.length === 0) {
    return (
      <Widget className="flex max-w-lg items-center gap-4 p-5">
        <Tile tint="orange" size="lg">🔒</Tile>
        <p className="text-muted">Sua conta ainda não tem acesso a nenhum módulo. Peça para a administração da agência liberar.</p>
      </Widget>
    );
  }

  return <HomeGrid modules={modulesFor(session.roles)} firstName={session.name.split(/[\s@]/)[0] || "por aqui"} />;
}
