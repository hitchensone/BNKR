import Link from "next/link";
import type { SystemModule } from "@/lib/modules";
import { Bridge, Tile, WidgetGroup } from "./ui";

export function HomeGrid({ modules, firstName }: { modules: SystemModule[]; firstName: string }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pt-2 md:pt-6">
      <header className="px-1">
        <p className="text-sm text-muted">Bem-vindo de volta,</p>
        <h1 className="text-xl font-bold tracking-tight">{firstName}</h1>
      </header>

      {/* Celular: grade compacta de 2 colunas */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {modules.map((m) => (
          <Link key={m.id} href={m.href} className="widget flex flex-col gap-3 p-3 transition active:scale-[0.98]">
            <Tile tint={m.tint} size="md">{m.icon}</Tile>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight">{m.name}</h2>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted">{m.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden gap-x-5 gap-y-6 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <WidgetGroup key={m.id}>
            <div className="widget flex items-center gap-3.5 p-3">
              <Tile tint={m.tint} size="lg">{m.icon}</Tile>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold tracking-tight">{m.name}</h2>
                <p className="truncate text-xs text-muted">{m.description}</p>
              </div>
            </div>
            <Bridge align="end" offset="3rem" size="2rem" />
            <div className="widget flex items-center justify-between gap-3 p-2.5 pl-4">
              <span className={m.ready ? "pill bg-tint-green text-ok" : "pill bg-tile text-muted"}>
                {m.ready ? "Disponível" : "Em breve"}
              </span>
              <Link href={m.href} className={m.ready ? "btn btn-primary h-10 px-5 text-sm" : "btn btn-soft h-10 px-5 text-sm"}>
                {m.ready ? "Abrir" : "Ver"}
              </Link>
            </div>
          </WidgetGroup>
        ))}
      </div>
    </div>
  );
}
