import { notFound } from "next/navigation";
import { z } from "zod";
import { BriefingHeader } from "@/components/go-cl/briefing-header";
import { BriefingForm } from "@/components/go-cl/briefing-form";
import { requireStaff } from "@/lib/data/session";
import { getLead } from "@/lib/data/leads";
import { getBriefingByLead } from "@/lib/data/contracts";
import { saveBriefingAction } from "./actions";

export default async function BriefingPage({ params }: PageProps<"/go-cl/[id]/briefing">) {
  await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const lead = await getLead(id).catch(() => null);
  if (!lead) notFound();
  const briefing = await getBriefingByLead(id);

  return (
    <div className="flex flex-col gap-8">
      <BriefingHeader lead={lead} briefing={briefing} />
      <BriefingForm leadId={lead.id} briefing={briefing} action={saveBriefingAction} />
    </div>
  );
}
