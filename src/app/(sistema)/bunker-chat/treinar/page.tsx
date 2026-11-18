import Link from "next/link";
import { KnowledgeForm } from "@/components/chat/knowledge-form";
import { deleteKnowledgeAction } from "../actions";
import { assistantEnabled } from "@/lib/chat/assistant";
import { listKnowledge } from "@/lib/data/chat";
import { requireAdmin } from "@/lib/data/session";
import { Icon3D } from "@/components/icon3d";

export default async function TrainPage() {
  await requireAdmin();
  const items = await listKnowledge();
  const enabled = assistantEnabled();

  return (
    <section className="widget flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label="Treinar assistente">
      <header className="flex items-center gap-3 border-b border-border p-3">
        <Link href="/bunker-chat" aria-label="Voltar às conversas" className="tile size-11 text-lg lg:hidden">←</Link>
        <span className="tile size-10 bg-tint-purple text-lg"><Icon3D e="🧠" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">Treinar o assistente</h2>
          <p className="truncate text-xs text-muted">O que o 🤖 sabe sobre a agência, serviços e processos</p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-5">
        {!enabled && (
          <p className="rounded-[1.25rem] bg-tint-yellow p-3 text-sm text-warn">
            O assistente ainda está desligado. Para ligar de graça, crie uma chave em console.groq.com (sem cartão) e cadastre no Netlify como <b>GROQ_API_KEY</b> (Site configuration › Environment variables). Depois é só publicar de novo.
          </p>
        )}
        <div className="rounded-[1.25rem] bg-tile/60 p-4 text-sm text-muted">
          <p><b className="text-foreground">Como ele responde:</b> com o que estiver aqui e com os dados do sistema que quem pergunta pode ver (projetos, etapas, pedidos de arquivo, posts e demandas). O financeiro nunca entra.</p>
          <p className="mt-2"><b className="text-foreground">Equipe</b>: só aparece nas conversas internas. <b className="text-foreground">Todos</b>: também nas conversas com clientes, que leem a resposta. Não coloque aqui senhas nem dados sensíveis: no plano grátis, o provedor pode guardar as conversas.</p>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Novo conhecimento</h3>
          <KnowledgeForm />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Base atual ({items.length})</h3>
          {items.length === 0 && <p className="px-1 text-sm text-muted">Nada cadastrado ainda.</p>}
          {items.map((k) => (
            <details key={k.id} className="group rounded-[1.5rem] bg-tile/50 p-3 open:bg-raised open:ring-1 open:ring-border">
              <summary className="flex cursor-pointer list-none items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-semibold">{k.title}</span>
                {!k.active && <span className="pill bg-tile text-muted">Pausado</span>}
                <span className={`pill ${k.audience === "todos" ? "bg-tint-green text-ok" : "bg-tint-blue text-primary"}`}>
                  {k.audience === "todos" ? "Todos" : "Equipe"}
                </span>
              </summary>
              <div className="mt-3 flex flex-col gap-2">
                <KnowledgeForm item={k} />
                <form action={deleteKnowledgeAction}>
                  <input type="hidden" name="id" value={k.id} />
                  <button className="text-xs font-semibold text-muted hover:text-accent">Excluir da base</button>
                </form>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
