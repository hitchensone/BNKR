import { RecurringList } from "@/components/go-grand/recurring-list";
import { requireAdmin, todaySP } from "@/lib/data/session";
import { listRecurring } from "@/lib/data/finance";
import { addRecurring, stopRecurring } from "../actions";

export default async function RecurringPage() {
  await requireAdmin();
  const [items, today] = await Promise.all([listRecurring(), todaySP()]);
  return <RecurringList items={items} today={today} addAction={addRecurring} stopAction={stopRecurring} />;
}
