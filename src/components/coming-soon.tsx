import Link from "next/link";
import type { SystemModule } from "@/lib/modules";
import { Bridge, Tile, WidgetGroup } from "./ui";

export function ComingSoon({ module: m }: { module: SystemModule }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <WidgetGroup className="w-full max-w-md">
        <div className="widget flex flex-col items-center gap-4 p-8 text-center">
          <Tile tint={m.tint} size="lg" className="size-20 text-4xl">{m.icon}</Tile>
          <div>
            <h1 className="text-2xl font-bold">{m.name}</h1>
            <p className="mt-1 text-muted">{m.description}</p>
          </div>
        </div>
        <Bridge />
        <div className="widget flex items-center justify-between gap-3 p-3 pl-6">
          <span className="font-semibold">Módulo em construção</span>
          <Link href="/" className="btn btn-primary">Voltar</Link>
        </div>
      </WidgetGroup>
    </div>
  );
}
