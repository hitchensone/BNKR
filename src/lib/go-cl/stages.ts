import type { LeadStage } from "../types";

// Etapas do funil do GO CL, na ordem em que aparecem no quadro.
export const LEAD_STAGES: { id: LeadStage; label: string; phase: string }[] = [
  { id: "novo", label: "Novos", phase: "Atrair" },
  { id: "abordado", label: "Abordados", phase: "Atrair" },
  { id: "cativando", label: "Cativando", phase: "Cativar" },
  { id: "briefing", label: "Briefing", phase: "Estruturar" },
  { id: "proposta", label: "Proposta", phase: "Fechar" },
  { id: "negociacao", label: "Negociação", phase: "Fechar" },
  { id: "ganho", label: "Ganhos", phase: "Fechado" },
  { id: "perdido", label: "Perdidos", phase: "Fechado" },
];

export const OPEN_STAGES = LEAD_STAGES.filter((s) => s.id !== "ganho" && s.id !== "perdido");

export function stageLabel(stage: LeadStage) {
  return LEAD_STAGES.find((s) => s.id === stage)?.label ?? stage;
}
