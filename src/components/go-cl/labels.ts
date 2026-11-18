import type { ContactChannel, Lead } from "@/lib/types";
import type { Tint } from "../ui";

export const TEMPERATURE: Record<Lead["temperature"], { icon: string; tint: Tint; label: string }> = {
  quente: { icon: "🔥", tint: "red", label: "Quente" },
  morno: { icon: "🌤️", tint: "yellow", label: "Morno" },
  frio: { icon: "❄️", tint: "blue", label: "Frio" },
};

export const CHANNEL: Record<ContactChannel, { icon: string; label: string; tint: Tint }> = {
  whatsapp: { icon: "💬", label: "WhatsApp", tint: "green" },
  instagram: { icon: "📸", label: "Instagram", tint: "purple" },
  email: { icon: "✉️", label: "E-mail", tint: "blue" },
  ligacao: { icon: "📞", label: "Ligação", tint: "orange" },
  reuniao: { icon: "🤝", label: "Reunião", tint: "yellow" },
  presencial: { icon: "📍", label: "Presencial", tint: "red" },
  outro: { icon: "🗒️", label: "Outro", tint: "blue" },
};

const SP = "America/Sao_Paulo";

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: SP, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/** ISO → valor para <input type="datetime-local"> no horário de Brasília. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: SP, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}
