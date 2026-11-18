import { GrandDashboard } from "@/components/go-grand/dashboard";
import { requireAdmin, todaySP } from "@/lib/data/session";
import { generateRecurring, listRecurring, listTransactions } from "@/lib/data/finance";
import { monthOf, monthRange, shiftMonth } from "@/lib/go-grand/summary";
import { addTransaction, removeTransaction, togglePaid } from "./actions";

export default async function GoGrandPage({ searchParams }: PageProps<"/go-grand">) {
  await requireAdmin();
  const today = await todaySP();
  const { mes } = await searchParams;
  const month = typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : monthOf(today);

  // Garante as parcelas das recorrências até o mês seguinte.
  await generateRecurring();

  const from = monthRange(shiftMonth(month, -5)).from;
  const to = monthRange(month).to;
  const [transactions, recurring] = await Promise.all([listTransactions(from, to), listRecurring()]);

  return (
    <GrandDashboard
      month={month}
      today={today}
      transactions={transactions}
      recurring={recurring}
      addAction={addTransaction}
      toggleAction={togglePaid}
      removeAction={removeTransaction}
    />
  );
}
