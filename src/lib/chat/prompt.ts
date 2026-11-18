// Montagem do pedido ao assistente (puro, testável).

import type { ChatMessage } from "./helpers.ts";

export const ASSISTANT_NAME = "Assistente Bunker";

/** A mensagem chama o assistente? (@assistente, @bunker ou @ia) */
export const mentionsAssistant = (text: string) => /(^|\s)@(assistente|bunker|ia)\b/i.test(text);

export type KnowledgeItem = { title: string; content: string };

export interface AssistantContext {
  today: string;                     // YYYY-MM-DD
  asker: { name: string; isStaff: boolean };
  audience: "equipe" | "cliente";    // "cliente": a resposta aparece para o cliente
  knowledge: KnowledgeItem[];
  facts: string[];                   // dados do sistema já filtrados para o público
}

export function systemPrompt(ctx: AssistantContext) {
  const rules = [
    `Você é o ${ASSISTANT_NAME}, assistente da agência GO Bunker! Mídia e Tecnologia, dentro do sistema da agência.`,
    "Responda sempre em português do Brasil, de forma direta, simpática e curta (até 6 frases ou uma lista curta). Sem markdown pesado: no máximo listas simples com hífen.",
    "Use só as informações abaixo e a conversa. Se a resposta não estiver aqui, diga com clareza que não sabe e que a equipe vai responder — não invente prazos, preços, datas ou números.",
    "Nunca prometa nada em nome da agência (prazo, desconto, entrega) que não esteja escrito nas informações.",
    ctx.audience === "cliente"
      ? "Esta conversa é com um CLIENTE da agência: o cliente lê tudo o que você escrever. Fale com ele de forma cordial, sem jargão interno."
      : "Esta conversa é interna, da equipe da agência. Pode ser objetivo e técnico.",
    `Hoje é ${ctx.today} (horário de Brasília). Quem está falando com você: ${ctx.asker.name} (${ctx.asker.isStaff ? "equipe da agência" : "cliente"}).`,
  ];
  const kb = ctx.knowledge.length
    ? ctx.knowledge.map((k) => `### ${k.title}\n${k.content}`).join("\n\n")
    : "(nenhuma)";
  const facts = ctx.facts.length ? ctx.facts.map((f) => `- ${f}`).join("\n") : "(nenhum)";
  return `${rules.join("\n")}\n\n## Base de conhecimento da agência\n${kb}\n\n## Dados atuais do sistema\n${facts}`;
}

/**
 * Converte o histórico em mensagens para o modelo: o que o assistente
 * disse vira "assistant"; o resto vira "user" com o nome de quem falou.
 * Mensagens seguidas do mesmo papel são juntadas (a API exige alternância).
 */
export function toModelMessages(history: ChatMessage[], maxChars = 12000) {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  let total = 0;
  for (const m of [...history].reverse()) {
    if (m.deleted_at) continue;
    const role = m.kind === "assistente" ? "assistant" : "user";
    const content = role === "assistant" ? m.body : `${m.author_name || "Usuário"}: ${m.body}`;
    total += content.length;
    if (total > maxChars) break;
    const first = out[0];
    if (first && first.role === role) first.content = `${content}\n${first.content}`;
    else out.unshift({ role, content });
  }
  while (out[0]?.role === "assistant") out.shift();
  return out;
}
