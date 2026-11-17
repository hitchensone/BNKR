import Link from "next/link";
import { requireSession } from "@/lib/data/session";
import { modulesFor } from "@/lib/modules";

// Sistema autenticado: as telas dependem da sessão, então podem esperar o servidor.
export const instant = false;

export default async function SystemLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const modules = modulesFor(session.roles);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-6 border-b border-border bg-surface px-4 py-3">
        <Link href="/" className="font-semibold">GO Bunker!</Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
          {modules.map((m) => (
            <Link key={m.id} href={m.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground">
              {m.name}
            </Link>
          ))}
        </nav>
        <span className="hidden text-sm text-muted sm:inline">{session.name}</span>
        <form action="/auth/sair" method="post">
          <button className="text-sm text-muted hover:text-foreground">Sair</button>
        </form>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
