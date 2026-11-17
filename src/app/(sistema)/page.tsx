import Link from "next/link";
import { requireSession } from "@/lib/data/session";
import { modulesFor } from "@/lib/modules";

export default async function Desktop() {
  const session = await requireSession();
  const modules = modulesFor(session.roles);

  if (session.roles.length === 0) {
    return (
      <p className="text-muted">
        Sua conta ainda não tem acesso a nenhum módulo. Peça para a administração da agência liberar.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((m) => (
        <Link key={m.id} href={m.href}
          className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{m.name}</h2>
            {!m.ready && <span className="text-xs text-muted">em breve</span>}
          </div>
          <p className="mt-1 text-sm text-muted">{m.description}</p>
        </Link>
      ))}
    </div>
  );
}
