import Link from "next/link";
import type { SystemModule } from "@/lib/modules";
import { Bridge, Tile, WidgetGroup } from "./ui";

export function HomeGrid({ modules, firstName }: { modules: SystemModule[]; firstName: string }) {
  return (
    <div className="flex flex-col gap-8">
      <header className="pt-2">
        <p className="text-muted">Bem-vindo de volta,</p>
        <h1 className="text-3xl font-bold tracking-tight">{firstName}</h1>
      </header>

      <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <WidgetGroup key={m.id}>
            <div className="widget flex items-center gap-4 p-3 pr-3">
              <Tile tint={m.tint} size="lg">{m.icon}</Tile>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold">{m.name}</h2>
                <p className="truncate text-sm text-muted">{m.description}</p>
              </div>
            </div>
            <Bridge align="end" offset="3.5rem" />
            <div className="widget flex items-center justify-between gap-3 p-3 pl-5">
              <span className={m.ready ? "pill bg-tint-green text-[#3c8a2e]" : "pill bg-tile text-muted"}>
                {m.ready ? "Disponível" : "Em breve"}
              </span>
              {m.ready ? (
                <Link href={m.href} className="btn btn-primary">Abrir</Link>
              ) : (
                <Link href={m.href} className="btn btn-soft">Ver</Link>
              )}
            </div>
          </WidgetGroup>
        ))}
      </div>
    </div>
  );
}
