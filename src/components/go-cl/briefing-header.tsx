import Link from "next/link";
import type { Briefing, Lead } from "@/lib/types";
import { Tile, WidgetGroup } from "../ui";

export function BriefingStatus({ briefing }: { briefing: Briefing | null }) {
  if (!briefing) return <span className="pill bg-tile text-muted">Não iniciado</span>;
  return briefing.status === "validado"
    ? <span className="pill bg-tint-green text-ok">Validado</span>
    : <span className="pill bg-tint-yellow text-warn">Rascunho</span>;
}

export function BriefingHeader({ lead, briefing }: { lead: Lead; briefing: Briefing | null }) {
  return (
    <WidgetGroup row className="w-full">
      <Link href={`/go-cl/${lead.id}`} aria-label="Voltar ao lead" className="widget grid place-items-center p-3">
        <span className="tile size-12 text-lg">←</span>
      </Link>
      <div className="bridge" aria-hidden style={{ ["--bridge-size" as string]: "2rem" }} />
      <div className="widget flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 p-3 pr-5">
        <Tile tint="purple" size="lg">📝</Tile>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Briefing</p>
          <h1 className="truncate text-2xl font-bold tracking-tight">{lead.company_name}</h1>
        </div>
        <BriefingStatus briefing={briefing} />
      </div>
    </WidgetGroup>
  );
}
