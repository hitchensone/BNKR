import Link from "next/link";
import { StaffForm } from "@/components/go-up/forms";
import { Bridge, Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireAdmin } from "@/lib/data/session";
import { canCreateAccess } from "@/lib/data/portal";
import { listStaff } from "@/lib/data/work";
import { initials } from "@/lib/go-up/helpers";
import { removeStaff } from "../actions";

const ROLE = { owner: "Dono", admin: "Admin", team: "Equipe" } as const;

export default async function TeamPage() {
  const session = await requireAdmin();
  const staff = await listStaff();
  const canCreate = canCreateAccess();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <Widget className="flex items-center gap-4 p-3">
        <Link href="/go-up" aria-label="Voltar ao GO UP" className="tile size-12 text-lg">←</Link>
        <Tile tint="blue" size="lg">👥</Tile>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted">Quem trabalha nos projetos. Admin também vê o financeiro.</p>
        </div>
      </Widget>

      <WidgetGroup>
        <div className="widget flex items-center gap-4 p-3">
          <Tile tint="green" size="md">🧑‍💻</Tile>
          <div>
            <h2 className="text-lg font-bold">{staff.length} pessoa{staff.length === 1 ? "" : "s"}</h2>
            <p className="text-sm text-muted">Disponíveis para receber demandas.</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget flex flex-col gap-4 p-4">
          <ul className="flex flex-col gap-1">
            {staff.map((s) => (
              <li key={`${s.user_id}-${s.role}`} className="flex items-center gap-3 rounded-[1.25rem] p-2">
                <span className="grid size-10 place-items-center rounded-full bg-tint-blue text-sm font-bold text-primary">{initials(s.full_name)}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{s.full_name ?? "Sem nome"}{s.user_id === session.userId ? " (você)" : ""}</span>
                <span className="pill bg-tile text-muted">{ROLE[s.role]}</span>
                {canCreate && s.role !== "owner" && s.user_id !== session.userId && (
                  <form action={removeStaff}>
                    <input type="hidden" name="user_id" value={s.user_id} />
                    <button className="btn btn-soft h-9 px-3 text-xs text-accent">Remover</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {canCreate ? <StaffForm /> : (
            <p className="rounded-[1.25rem] bg-tint-yellow p-3 text-sm">Para criar acessos, configure a <code className="font-semibold">SUPABASE_SECRET_KEY</code> no Netlify.</p>
          )}
        </div>
      </WidgetGroup>
    </div>
  );
}
