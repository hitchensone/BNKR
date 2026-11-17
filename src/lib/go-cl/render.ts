import type { Briefing, Contract, Lead } from "../types.ts";

// Preenchimento de modelos com {{variaveis}}.
// Variável sem valor fica como "____" para ficar visível na revisão.

const BLANK = "____";

export function fillTemplate(body: string, vars: Record<string, string | null | undefined>) {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const value = vars[key];
    return value && value.trim() ? value : BLANK;
  });
}

/** Lista as variáveis que um modelo usa (para validar antes de enviar). */
export function templateVariables(body: string) {
  return [...new Set([...body.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)].map((m) => m[1]))];
}

// ---------------------------------------------------------------------
// Mensagens para leads (atrair e cativar)
// ---------------------------------------------------------------------
export function renderLeadMessage(body: string, lead: Lead, agencyName: string) {
  return fillTemplate(body, {
    contato: lead.contact_name?.split(" ")[0],
    empresa: lead.company_name,
    segmento: lead.segment,
    cidade: lead.city,
    agencia: agencyName,
  });
}

/** Link de WhatsApp com a mensagem pronta (abre no app, quem envia é você). */
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number | null | undefined) {
  return value == null ? BLANK : brl.format(value);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return BLANK;
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function longDate(date = new Date()) {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function contractValuesText(c: Pick<Contract, "billing_type" | "monthly_value" | "one_time_value">) {
  const mensal = `A CONTRATANTE pagará à CONTRATADA o valor mensal de ${formatBRL(c.monthly_value)}.`;
  const unico = `A CONTRATANTE pagará à CONTRATADA o valor único de ${formatBRL(c.one_time_value)}.`;
  if (c.billing_type === "mensal") return mensal;
  if (c.billing_type === "unico") return unico;
  return `${mensal}\n\nAlém disso, ${unico.charAt(0).toLowerCase()}${unico.slice(1)}`;
}

/** Escopo do contrato a partir das entregas e campanhas do briefing. */
export function scopeFromBriefing(b: Pick<Briefing, "deliverables" | "campaigns">) {
  const linhas: string[] = [];
  for (const d of b.deliverables ?? []) {
    const qtd = d.quantidade ? `${d.quantidade} × ` : "";
    const per = d.periodicidade ? ` (${d.periodicidade})` : "";
    linhas.push(`- ${qtd}${d.item}${per}`);
  }
  for (const c of b.campaigns ?? []) {
    const canais = c.canais?.length ? ` em ${c.canais.join(", ")}` : "";
    const periodo = c.periodo ? `, ${c.periodo}` : "";
    linhas.push(`- Campanha "${c.nome}"${canais}${periodo}`);
  }
  return linhas.join("\n");
}

export interface AgencyInfo {
  documento?: string;
  endereco?: string;
  cidadeForo?: string;
}

export function renderContract(template: string, c: Contract, agency: AgencyInfo, today = new Date()) {
  return fillTemplate(template, {
    numero: c.number,
    agencia_documento: agency.documento,
    agencia_endereco: agency.endereco,
    contratante_nome: c.party_name,
    contratante_documento: c.party_document,
    contratante_endereco: c.party_address,
    escopo: c.scope,
    valores: contractValuesText(c),
    dia_pagamento: c.payment_day?.toString(),
    data_inicio: formatDate(c.start_date),
    duracao_meses: c.duration_months?.toString(),
    clausulas_extras: c.extra_clauses ?? "",
    cidade_foro: agency.cidadeForo,
    data_hoje: longDate(today),
  }).replace(/\n____\n/g, "\n"); // cláusulas extras vazias somem
}
