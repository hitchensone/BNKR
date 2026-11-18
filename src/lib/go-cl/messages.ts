import type { Lead, MessageTemplate } from "../types";
import type { ReadyMessage } from "@/components/go-cl/message-card";
import { fillTemplate, renderLeadMessage, whatsappLink } from "./render";

/** Monta as mensagens prontas do lead: texto preenchido + link que abre o app. */
export function buildReadyMessages(lead: Lead, templates: MessageTemplate[], agencyName: string): ReadyMessage[] {
  const vars = (t: string) => renderLeadMessage(t, lead, agencyName);

  return templates
    .map((t) => {
      const text = vars(t.body);
      const subject = t.subject ? fillTemplate(t.subject, {
        contato: lead.contact_name?.split(" ")[0], empresa: lead.company_name,
        segmento: lead.segment, cidade: lead.city, agencia: agencyName,
      }) : null;

      let href: string | null = null;
      let missing: string | null = null;
      if (t.channel === "whatsapp") {
        href = lead.phone ? whatsappLink(lead.phone, text) : null;
        missing = "Cadastre o WhatsApp do lead para abrir direto.";
      } else if (t.channel === "email") {
        href = lead.email
          ? `mailto:${lead.email}?subject=${encodeURIComponent(subject ?? "")}&body=${encodeURIComponent(text)}`
          : null;
        missing = "Cadastre o e-mail do lead para abrir direto.";
      } else if (t.channel === "instagram") {
        href = lead.instagram ? `https://instagram.com/${lead.instagram.replace(/^@/, "")}` : null;
        missing = "Cadastre o Instagram do lead para abrir direto.";
      }

      return {
        templateId: t.id,
        name: t.name,
        channel: t.channel,
        subject,
        text,
        href,
        missing: href ? null : missing,
        recommended: t.stage === lead.stage,
      };
    })
    .sort((a, b) => Number(b.recommended) - Number(a.recommended));
}
