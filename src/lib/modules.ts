import type { AppRole } from "./types";

// Registro dos módulos do sistema. A barra/dock lê daqui, então ligar ou
// desligar um módulo é só mudar este arquivo.

export interface SystemModule {
  id: "go-cl" | "go-up" | "go-grand" | "go-there" | "bunker-chat";
  name: string;
  description: string;
  href: string;
  icon: string;
  tint: "red" | "yellow" | "green" | "blue" | "purple" | "orange";
  roles: AppRole[];
  ready: boolean;
}

export const MODULES: SystemModule[] = [
  {
    id: "go-cl",
    name: "GO CL",
    description: "Captação de leads, briefing e contratos",
    href: "/go-cl",
    icon: "🎯",
    tint: "red",
    roles: ["owner", "admin", "team"],
    ready: true,
  },
  {
    id: "go-up",
    name: "GO UP",
    description: "Projetos, fluxos, demandas e postagens",
    href: "/go-up",
    icon: "🚀",
    tint: "blue",
    roles: ["owner", "admin", "team"],
    ready: false,
  },
  {
    id: "go-grand",
    name: "GO GRAND",
    description: "Financeiro: entradas, saídas e indicadores",
    href: "/go-grand",
    icon: "💰",
    tint: "yellow",
    roles: ["owner", "admin"],
    ready: true,
  },
  {
    id: "go-there",
    name: "GO THERE",
    description: "Portal de acompanhamento e arquivos",
    href: "/go-there",
    icon: "🛰️",
    tint: "purple",
    roles: ["owner", "admin", "team", "client"],
    ready: false,
  },
  {
    id: "bunker-chat",
    name: "BUNKER CHAT",
    description: "Chat interno, com clientes e assistente",
    href: "/bunker-chat",
    icon: "💬",
    tint: "green",
    roles: ["owner", "admin", "team", "client"],
    ready: false,
  },
];

export function modulesFor(roles: AppRole[]) {
  return MODULES.filter((m) => m.roles.some((r) => roles.includes(r)));
}
