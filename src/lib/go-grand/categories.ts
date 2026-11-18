import type { Tint } from "../../components/ui.tsx";

export type Kind = "entrada" | "saida";

export interface Category {
  id: string;
  kind: Kind;
  label: string;
  icon: string;
  tint: Tint;
  /** false = mexe no caixa, mas não é receita/despesa (aporte, retirada). */
  operational: boolean;
}

// Mesma lista do banco (grand_category_kind). Mudou lá, muda aqui.
export const CATEGORIES: Category[] = [
  { id: "contrato_mensal", kind: "entrada", label: "Contrato mensal", icon: "📄", tint: "blue", operational: true },
  { id: "contrato_unico", kind: "entrada", label: "Contrato · valor único", icon: "✍️", tint: "blue", operational: true },
  { id: "venda_tecnologia", kind: "entrada", label: "Venda de tecnologia", icon: "💻", tint: "purple", operational: true },
  { id: "servico_avulso", kind: "entrada", label: "Serviço avulso", icon: "🎨", tint: "green", operational: true },
  { id: "aporte", kind: "entrada", label: "Aporte", icon: "🏦", tint: "yellow", operational: false },
  { id: "outra_entrada", kind: "entrada", label: "Outras entradas", icon: "➕", tint: "green", operational: true },
  { id: "plataformas", kind: "saida", label: "Plataformas e softwares", icon: "🧩", tint: "purple", operational: true },
  { id: "ia", kind: "saida", label: "IAs", icon: "🤖", tint: "blue", operational: true },
  { id: "compra_tecnologia", kind: "saida", label: "Compra de produtos", icon: "📦", tint: "orange", operational: true },
  { id: "equipamentos", kind: "saida", label: "Equipamentos", icon: "🎥", tint: "yellow", operational: true },
  { id: "terceiros", kind: "saida", label: "Terceiros e freelas", icon: "🤝", tint: "green", operational: true },
  { id: "marketing", kind: "saida", label: "Anúncios e marketing", icon: "📣", tint: "red", operational: true },
  { id: "impostos", kind: "saida", label: "Impostos e taxas", icon: "🧾", tint: "orange", operational: true },
  { id: "retirada", kind: "saida", label: "Retirada / pró-labore", icon: "👛", tint: "yellow", operational: false },
  { id: "outra_saida", kind: "saida", label: "Outras saídas", icon: "➖", tint: "red", operational: true },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function category(id: string): Category {
  return BY_ID.get(id) ?? { id, kind: "saida", label: id, icon: "•", tint: "blue", operational: true };
}

export function isCategoryOf(id: string, kind: Kind) {
  return BY_ID.get(id)?.kind === kind;
}
