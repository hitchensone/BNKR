import { LeadBoard } from "@/components/go-cl/board";
import { requireStaff } from "@/lib/data/session";
import { listLeads } from "@/lib/data/leads";
import { changeStage } from "./actions";
import { NewLeadForm } from "./new-lead";

export default async function GoClPage() {
  await requireStaff();
  const leads = await listLeads();
  return <LeadBoard leads={leads} moveAction={changeStage} newLeadForm={<NewLeadForm />} />;
}
