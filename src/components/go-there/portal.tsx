import Link from "next/link";
import {
  changeFileVisibility, changeProject, changeRequest, changeStage, removeFile, removeStage, revokeClientAccess,
} from "@/app/(sistema)/go-there/actions";
import { currentStage, formatBytes, progressOf } from "@/lib/go-there/progress";
import type { ClientTask, ClientUser, FileRequest, PortalFile, PortalProject, ProjectUpdate, Stage } from "@/lib/go-there/types";
import { formatDateTime } from "../go-cl/labels";
import { Bridge, Tile, Widget, WidgetGroup } from "../ui";
import { AccessForm, RequestForm, StageForm, UpdateForm } from "./forms";
import { Uploader } from "./uploader";
import { PortalPosts } from "./posts-section";
import type { PostWithProject } from "@/lib/data/posts";

const br = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

export const PROJECT_STATUS: Record<PortalProject["status"], { label: string; cls: string }> = {
  planejamento: { label: "Planejamento", cls: "bg-tint-yellow text-[#8a6d00]" },
  em_andamento: { label: "Em andamento", cls: "bg-tint-blue text-primary" },
  pausado: { label: "Pausado", cls: "bg-tile text-muted" },
  concluido: { label: "Concluído", cls: "bg-tint-green text-[#3c8a2e]" },
  cancelado: { label: "Cancelado", cls: "bg-tile text-muted" },
};

const STAGE: Record<Stage["status"], { icon: string; label: string; tile: string }> = {
  concluida: { icon: "✓", label: "Concluída", tile: "bg-tint-green text-[#3c8a2e]" },
  em_andamento: { icon: "●", label: "Em andamento", tile: "bg-tint-blue text-primary" },
  pendente: { icon: "○", label: "Pendente", tile: "bg-tile text-muted" },
};

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-tile" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2.5 rounded-full bg-gradient-to-r from-[#5574ff] to-[#2e4ff0]" style={{ width: `${value}%` }} />
    </div>
  );
}

function SectionHead({ icon, tint, title, hint }: { icon: string; tint: "blue" | "green" | "purple" | "orange" | "yellow" | "red"; title: string; hint: string }) {
  return (
    <div className="widget flex items-center gap-4 p-3">
      <Tile tint={tint} size="md">{icon}</Tile>
      <div className="min-w-0">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </div>
    </div>
  );
}

export function ProjectPortal({
  project,
  stages,
  clientTasks = [],
  updates,
  requests,
  files,
  isStaff,
  isAdmin,
  clientUsers,
  canCreateAccess,
  posts = [],
  today = "",
  chatHref,
}: {
  project: PortalProject;
  stages: Stage[];
  clientTasks?: ClientTask[];
  updates: ProjectUpdate[];
  requests: FileRequest[];
  files: PortalFile[];
  isStaff: boolean;
  isAdmin: boolean;
  clientUsers: ClientUser[];
  canCreateAccess: boolean;
  posts?: PostWithProject[];
  today?: string;
  chatHref?: string;
}) {
  const progress = progressOf(stages);
  const current = currentStage(stages);
  const clientName = project.client?.trade_name || project.client?.name || "Cliente";
  const st = PROJECT_STATUS[project.status];
  const filesByRequest = new Map<string, PortalFile[]>();
  for (const f of files) if (f.request_id) filesByRequest.set(f.request_id, [...(filesByRequest.get(f.request_id) ?? []), f]);

  // Do ponto de vista de quem está vendo.
  const toMe = requests.filter((r) => (isStaff ? r.direction === "cliente_pede" : r.direction === "agencia_pede"));
  const fromMe = requests.filter((r) => (isStaff ? r.direction === "agencia_pede" : r.direction === "cliente_pede"));

  const requestItem = (r: FileRequest, answerable: boolean) => {
    const answers = filesByRequest.get(r.id) ?? [];
    const pill = r.status === "concluido" ? "bg-tint-green text-[#3c8a2e]" : r.status === "respondido" ? "bg-tint-blue text-primary" : "bg-tint-yellow text-[#8a6d00]";
    return (
      <li key={r.id} className="flex flex-col gap-2 rounded-[1.5rem] bg-tile/50 p-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-40 flex-1">
            <p className="font-semibold">{r.title}</p>
            {r.description && <p className="text-sm text-muted">{r.description}</p>}
            {r.due_date && <p className="text-xs text-muted">Prazo: {br(r.due_date)}</p>}
          </div>
          <span className={`pill ${pill}`}>
            {r.status === "aberto" ? "Aguardando" : r.status === "respondido" ? "Respondido" : "Concluído"}
          </span>
        </div>
        {answers.length > 0 && (
          <ul className="flex flex-col gap-1">
            {answers.map((f) => (
              <li key={f.id}>
                {f.url
                  ? <a href={f.url} className="text-sm font-medium text-primary hover:underline">📎 {f.name}</a>
                  : <span className="text-sm text-muted">📎 {f.name}</span>}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {answerable && r.status !== "concluido" && (
            <Uploader projectId={project.id} clientId={project.client_id} requestId={r.id} compact label="Enviar resposta" />
          )}
          {isStaff && r.status !== "concluido" && (
            <form action={changeRequest}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="status" value="concluido" />
              <button className="btn btn-soft h-9 bg-white px-3 text-xs">Concluir</button>
            </form>
          )}
          {isStaff && r.status === "concluido" && (
            <form action={changeRequest}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="status" value="aberto" />
              <button className="btn btn-soft h-9 bg-white px-3 text-xs">Reabrir</button>
            </form>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho */}
      <WidgetGroup row className="w-full">
        <Link href="/go-there" aria-label="Voltar aos projetos" className="widget grid place-items-center p-3">
          <span className="tile size-12 text-lg">←</span>
        </Link>
        <div className="bridge" aria-hidden style={{ ["--bridge-size" as string]: "2rem" }} />
        <div className="widget flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-3 p-3 pr-5">
          <Tile tint="purple" size="lg">🛰️</Tile>
          <div className="min-w-48 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{clientName}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{project.name}</h1>
          </div>
          <span className={`pill ${st.cls}`}>{st.label}</span>
          {chatHref && <Link href={chatHref} className="btn btn-soft h-11 px-4 text-sm">💬 {isStaff ? "Conversa com o cliente" : "Falar com a agência"}</Link>}
        </div>
      </WidgetGroup>

      {/* Progresso */}
      <Widget className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Progresso</p>
            <p className="text-3xl font-bold tabular-nums">{progress}%</p>
          </div>
          <div className="text-right text-sm">
            {current ? (
              <>
                <p className="text-muted">Etapa atual</p>
                <p className="font-semibold">{current.title}</p>
              </>
            ) : stages.length ? <p className="font-semibold">Todas as etapas concluídas 🎉</p> : <p className="text-muted">Etapas ainda não definidas</p>}
          </div>
        </div>
        <ProgressBar value={progress} />
        {project.ends_on && <p className="text-xs text-muted">Entrega prevista: {br(project.ends_on)}</p>}
        {isStaff && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <form action={changeProject} className="flex items-center gap-2">
              <input type="hidden" name="id" value={project.id} />
              <select name="status" defaultValue={project.status} aria-label="Situação do projeto" className="h-9 rounded-xl bg-tile px-2 text-xs font-semibold outline-none">
                {Object.entries(PROJECT_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
              </select>
              <button className="btn btn-soft h-9 px-3 text-xs">Atualizar</button>
            </form>
            <form action={changeProject}>
              <input type="hidden" name="id" value={project.id} />
              <input type="hidden" name="visible_to_client" value={project.visible_to_client ? "0" : "1"} />
              <button className="btn btn-soft h-9 px-3 text-xs">
                {project.visible_to_client ? "👁 Cliente vê este projeto" : "🙈 Oculto para o cliente"}
              </button>
            </form>
          </div>
        )}
      </Widget>

      <PortalPosts posts={posts} isStaff={isStaff} today={today} />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* Etapas */}
          <WidgetGroup>
            <SectionHead icon="🗺️" tint="blue" title="Etapas" hint={isStaff ? "O cliente acompanha cada etapa até a entrega." : "O caminho até a entrega."} />
            <Bridge align="start" offset="3.5rem" />
            <div className="widget flex flex-col gap-3 p-4">
              <ol className="flex flex-col">
                {stages.map((s, i) => {
                  const look = STAGE[s.status];
                  return (
                    <li key={s.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${look.tile}`} aria-label={look.label}>{look.icon}</span>
                        {i < stages.length - 1 && <span className="my-1 w-0.5 flex-1 rounded bg-border" />}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2 pb-4">
                        <div className="min-w-40 flex-1">
                          <p className={`font-semibold ${s.status === "concluida" ? "text-muted line-through decoration-1" : ""}`}>{s.title}</p>
                          <p className="text-xs text-muted">
                            {look.label}
                            {s.status === "concluida" && s.completed_at ? ` em ${br(s.completed_at)}` : s.due_date ? ` · prazo ${br(s.due_date)}` : ""}
                          </p>
                        </div>
                        {isStaff && (
                          <div className="flex items-center gap-1">
                            <form action={changeStage} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="project_id" value={project.id} />
                              <select name="status" defaultValue={s.status} aria-label={`Situação de ${s.title}`} className="h-9 rounded-xl bg-tile px-2 text-xs font-semibold outline-none">
                                <option value="pendente">Pendente</option>
                                <option value="em_andamento">Em andamento</option>
                                <option value="concluida">Concluída</option>
                              </select>
                              <button className="btn btn-soft h-9 px-3 text-xs">OK</button>
                            </form>
                            <form action={removeStage}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="project_id" value={project.id} />
                              <button aria-label={`Excluir etapa ${s.title}`} className="tile size-9 text-xs text-muted hover:bg-tint-red hover:text-accent">✕</button>
                            </form>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {stages.length === 0 && <p className="p-2 text-center text-sm text-muted">Nenhuma etapa ainda.</p>}
              {isStaff && <StageForm projectId={project.id} />}
            </div>
          </WidgetGroup>

          {/* Entregas em produção (demandas do GO UP liberadas ao cliente) */}
          {clientTasks.length > 0 && (
            <WidgetGroup>
              <SectionHead icon="🛠️" tint="yellow" title="Em produção" hint={isStaff ? "Demandas do GO UP que o cliente acompanha." : "O que a equipe está produzindo para você."} />
              <Bridge align="start" offset="3.5rem" />
              <ul className="widget flex flex-col gap-1 p-2">
                {clientTasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-[1.25rem] p-2">
                    <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ${t.completed_at ? "bg-tint-green text-[#3c8a2e]" : "bg-tile text-muted"}`}>{t.completed_at ? "✓" : "•"}</span>
                    <span className={`min-w-40 flex-1 font-medium ${t.completed_at ? "text-muted line-through decoration-1" : ""}`}>{t.title}</span>
                    {t.column && <span className="pill bg-tile text-muted">{t.column.name}</span>}
                    {t.due_date && !t.completed_at && <span className="text-xs text-muted">até {br(t.due_date)}</span>}
                  </li>
                ))}
              </ul>
            </WidgetGroup>
          )}

          {/* Mural */}
          <WidgetGroup>
            <SectionHead icon="📢" tint="orange" title="Mural" hint="Novidades do projeto." />
            <Bridge align="start" offset="3.5rem" />
            <div className="widget flex flex-col gap-4 p-4">
              {isStaff && <UpdateForm projectId={project.id} />}
              <ul className="flex flex-col gap-3">
                {updates.map((u) => (
                  <li key={u.id} className="rounded-[1.25rem] bg-tile/50 p-3">
                    <p className="whitespace-pre-line text-sm">{u.body}</p>
                    <p className="mt-1 text-xs text-muted">{u.author} · {formatDateTime(u.created_at)}</p>
                  </li>
                ))}
                {updates.length === 0 && <li className="p-2 text-center text-sm text-muted">Nenhuma atualização ainda.</li>}
              </ul>
            </div>
          </WidgetGroup>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          {/* Pedidos */}
          <WidgetGroup>
            <SectionHead icon="📥" tint="green" title="Pedidos de arquivo"
              hint={isStaff ? "O que o cliente pediu e o que você pediu a ele." : "O que a agência precisa de você e o que você pediu."} />
            <Bridge align="start" offset="3.5rem" />
            <div className="widget flex flex-col gap-5 p-4">
              <section className="flex flex-col gap-2">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  {isStaff ? "O cliente pediu" : "A agência precisa de você"}
                </h3>
                <ul className="flex flex-col gap-2">
                  {toMe.map((r) => requestItem(r, true))}
                  {toMe.length === 0 && <li className="px-1 text-sm text-muted">Nada pendente.</li>}
                </ul>
              </section>
              <section className="flex flex-col gap-2">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  {isStaff ? "Você pediu ao cliente" : "Você pediu à agência"}
                </h3>
                <ul className="flex flex-col gap-2">
                  {fromMe.map((r) => requestItem(r, false))}
                  {fromMe.length === 0 && <li className="px-1 text-sm text-muted">Nenhum pedido.</li>}
                </ul>
                <RequestForm projectId={project.id} isStaff={isStaff} />
              </section>
            </div>
          </WidgetGroup>

          {/* Arquivos */}
          <WidgetGroup>
            <SectionHead icon="🗂️" tint="purple" title="Arquivos" hint={isStaff ? "Entregas e materiais. Escolha quem vê cada um." : "Entregas e materiais do projeto."} />
            <Bridge align="start" offset="3.5rem" />
            <div className="widget flex flex-col gap-3 p-4">
              <Uploader projectId={project.id} clientId={project.client_id} allowInternal={isStaff} />
              <ul className="flex flex-col gap-1">
                {files.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-[1.25rem] p-2 transition hover:bg-tile/50">
                    <Tile tint={f.mime_type?.startsWith("image/") ? "orange" : f.mime_type?.startsWith("video/") ? "red" : "blue"} size="sm">
                      {f.mime_type?.startsWith("image/") ? "🖼️" : f.mime_type?.startsWith("video/") ? "🎬" : f.mime_type === "application/pdf" ? "📕" : "📄"}
                    </Tile>
                    <div className="min-w-40 flex-1">
                      {f.url
                        ? <a href={f.url} className="block truncate font-semibold hover:text-primary">{f.name}</a>
                        : <p className="truncate font-semibold">{f.name}</p>}
                      <p className="text-xs text-muted">{formatBytes(f.size_bytes)} · {br(f.created_at)}</p>
                    </div>
                    {isStaff && (
                      <>
                        <form action={changeFileVisibility}>
                          <input type="hidden" name="id" value={f.id} />
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="visibility" value={f.visibility === "cliente" ? "interno" : "cliente"} />
                          <button className={`pill ${f.visibility === "cliente" ? "bg-tint-green text-[#3c8a2e]" : "bg-tile text-muted"}`}
                            title="Clique para alternar">
                            {f.visibility === "cliente" ? "👁 Cliente vê" : "🔒 Só a equipe"}
                          </button>
                        </form>
                        <form action={removeFile}>
                          <input type="hidden" name="id" value={f.id} />
                          <input type="hidden" name="project_id" value={project.id} />
                          <button aria-label={`Excluir ${f.name}`} className="tile size-9 text-xs text-muted hover:bg-tint-red hover:text-accent">✕</button>
                        </form>
                      </>
                    )}
                  </li>
                ))}
                {files.length === 0 && <li className="p-2 text-center text-sm text-muted">Nenhum arquivo ainda.</li>}
              </ul>
            </div>
          </WidgetGroup>

          {/* Acesso do cliente */}
          {isAdmin && (
            <WidgetGroup>
              <SectionHead icon="🔑" tint="yellow" title="Acesso do cliente" hint={`Quem da ${clientName} entra no portal.`} />
              <Bridge align="start" offset="3.5rem" />
              <div className="widget flex flex-col gap-3 p-4">
                <ul className="flex flex-col gap-1">
                  {clientUsers.map((u) => (
                    <li key={u.user_id} className="flex items-center gap-3 rounded-[1.25rem] p-2">
                      <Tile tint="blue" size="sm">👤</Tile>
                      <span className="min-w-0 flex-1 truncate font-medium">{u.name ?? "Sem nome"}</span>
                      {canCreateAccess && (
                        <form action={revokeClientAccess}>
                          <input type="hidden" name="user_id" value={u.user_id} />
                          <input type="hidden" name="client_id" value={project.client_id} />
                          <input type="hidden" name="project_id" value={project.id} />
                          <button className="btn btn-soft h-9 px-3 text-xs text-accent">Remover acesso</button>
                        </form>
                      )}
                    </li>
                  ))}
                  {clientUsers.length === 0 && <li className="px-1 text-sm text-muted">Ninguém do cliente tem acesso ainda.</li>}
                </ul>
                {canCreateAccess ? (
                  <AccessForm projectId={project.id} clientId={project.client_id} />
                ) : (
                  <p className="rounded-[1.25rem] bg-tint-yellow p-3 text-sm">
                    Para criar acessos pelo sistema, adicione a variável <code className="font-semibold">SUPABASE_SECRET_KEY</code> no Netlify
                    (a chave secreta do Supabase, em Project Settings › API Keys).
                  </p>
                )}
              </div>
            </WidgetGroup>
          )}
        </div>
      </div>
    </div>
  );
}
