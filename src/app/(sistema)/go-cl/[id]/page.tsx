import { notFound } from "next/navigation";
import { z } from "zod";
import { LeadDetail } from "@/components/go-cl/lead-detail";
import { requestTime, requireStaff } from "@/lib/data/session";
import { getLead, listInteractions, listMessageTemplates } from "@/lib/data/leads";
import { buildReadyMessages } from "@/lib/go-cl/messages";
import { changeStage } from "../actions";
import { addInteraction, recordTemplateUse, saveLeadInfo } from "./actions";

const AGENCY = process.env.AGENCIA_NOME || "GO Bunker!";

export default async function LeadPage({ params }: PageProps<"/go-cl/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const lead = await getLead(id).catch(() => null);
  if (!lead) notFound();

  const [interactions, templates, now] = await Promise.all([listInteractions(id), listMessageTemplates(), requestTime()]);

  return (
    <LeadDetail
      lead={lead}
      interactions={interactions}
      messages={buildReadyMessages(lead, templates, AGENCY)}
      moveAction={changeStage}
      saveAction={saveLeadInfo}
      interactionAction={addInteraction}
      onUseMessage={recordTemplateUse.bind(null, lead.id)}
      now={now}
    />
  );
}
